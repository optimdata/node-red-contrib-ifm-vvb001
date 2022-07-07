var api = require('./api.js')
var utils = require('./utils.js')

module.exports = function (RED) {
  function streamBlob(config) {
    RED.nodes.createNode(this, config)

    this.ip = config.ip
    this.ipType = config.ipType || 'str'
    this.port = config.port
    this.topic = config.topic || ''

    var node = this

    node.on('input', async function (msg, send, done) {
      'use strict'
      send = send || node.send
      done = done || function () {}

      // If the node's topic is set, copy to output msg
      if (node.topic !== '') {
        msg.topic = node.topic
      } // If nodes topic is blank, the input msg.topic is already there

      node.processedIp = utils.parseInput(RED, node, msg, 'ip', 'ipType')
      node.processedPort = node.port
      node.url = `http://${node.processedIp}:80`
      node.readAcyclicUrl = `/iolinkmaster/port[${node.processedPort}]/iolinkdevice/iolreadacyclic`
      node.writeAcyclicUrl = `/iolinkmaster/port[${node.processedPort}]/iolinkdevice/iolwriteacyclic`

      var requestObj = {
        code: 10,
        cid: 1235,
        adr: node.readAcyclicUrl,
        data: {
          index: 50,
          subindex: 0,
        },
      }

      var blobStatus = await api.doGetBlobStatus(node)
      if (blobStatus.dec == 0) {
        startRecordData(node).then(payload => {
          if (payload != undefined) {
            startBlobTransfer(node, payload)
              .then(payload => getBlobLength(requestObj, node, payload))
              .then(payload => getBlobSegments(requestObj, node, payload))
              .then(payload => getBlobCrc(requestObj, node, payload))
              .then(payload => stopBlobTransfer(node, payload))
              .then(payload => {
                if (payload) {
                  msg.payload = { ...msg.payload, ...payload }
                  send(msg)
                  done()
                  return payload
                }
              })
              .finally(() => {
                node.status({
                  fill: 'grey',
                  shape: 'dot',
                  text: 'Idle',
                })
              })
          }
        })
      } else {
        node.warn(
          `No blob transfer triggered as the actual blob status is ${blobStatus.str}`,
        )
      }
    })
  }

  RED.nodes.registerType('iolink-VVB001-stream-blob', streamBlob)

  function handleBlobTransferError(node, error) {
    node.error(`error: ${error}`)
    api.doAbortBlob(node)
  }

  async function startRecordData(node) {
    // Start command for a BLOB transfer
    node.debug('Running command to start blob recording')
    var requestObj = {
      code: 10,
      cid: 1236,
      adr: node.writeAcyclicUrl,
      data: {
        index: 2,
        subindex: 0,
        value: 'D4', // Recording via system command
      },
    }

    return await utils
      .request(node.url, 'POST', requestObj)
      .then(response => utils.checkIOLinkResponse(node, response))
      .then(() => {
        node.status({
          fill: 'yellow',
          shape: 'dot',
          text: 'BLOB recording via system command',
        })
        return { ts: new Date().toISOString() }
      })
      .catch(error => {
        node.error(
          `Error while starting a new recording via system command : ${error}`,
        )
      })
  }

  async function startBlobTransfer(node, payload) {
    node.debug('Running command to start blob transfer')

    var requestObj = {
      code: 10,
      cid: 1233,
      adr: node.writeAcyclicUrl,
      data: {
        index: 50,
        subindex: 0,
        value: 'F1EFFF', // Recording via system command
      },
    }

    return await utils
      .request(node.url, 'POST', requestObj)
      .then(response => utils.checkIOLinkResponse(node, response))
      .then(() => {
        node.status({
          fill: 'yellow',
          shape: 'dot',
          text: 'BLOB recorded and ready for transfer',
        })
        return payload
      })
      .catch(error => {
        node.error(`Error while starting blob transfer : ${error}`)
        handleBlobTransferError(node, error)
      })
  }

  async function getBlobSegments(requestObj, node, payload) {
    var moreData
    var response
    var header
    var processedBlob = []
    var segment = 0
    var processedBytes = 0

    if (payload) {
      node.debug('Running command to read blob segments')

      try {
        while (segment == 0 || moreData) {
          segment++
          response = await utils
            .request(node.url, 'POST', requestObj)
            .then(response => utils.checkIOLinkResponse(node, response))

          var original = response.data.value
          header = original.slice(0, 2)
          processedBytes += (original.length - 2) / 2
          moreData = header != '30' // a header of 30 represents the last segment of the BLOB
          var nodeStatus = `Reading blob ${
            (processedBytes * 100) / payload.length
          } %`
          node.debug(nodeStatus)
          node.status({
            fill: 'green',
            shape: 'dot',
            text: nodeStatus,
          })
          for (var i = 2; i < original.length; i += 4) {
            let hex = original.slice(i, i + 4) // each acceleration is stored in 2 bytes in little endian byte format
            let processed = (utils.parseInt16(hex, true) * 9.80665) / 524.288 // 2^16/125 to g, 1g=9.80665 m/s^2
            processedBlob.push(processed)
          }
        }
        payload.acceleration = processedBlob
        return payload
      } catch (error) {
        node.error(`Error while reading Blob segment ${segment}`)
        handleBlobTransferError(node, error)
      }
    }
  }

  async function getBlobLength(requestObj, node, payload) {
    // Read the BLOB data
    // First request returns BLOB length
    if (payload) {
      node.debug('Running command to read blob length')

      return await utils
        .request(node.url, 'POST', requestObj)
        .then(response => utils.checkIOLinkResponse(node, response))
        .then(response => {
          var original = response.data.value
          payload.length = parseInt(original.slice(2), 16) // skip header of a value 10 in hex for read mode
          node.status({
            fill: 'green',
            shape: 'dot',
            text: 'Reading BLOB length',
          })
          return payload
        })
        .catch(error => {
          node.error('Error while reading Blob length')
          handleBlobTransferError(node, error)
        })
    }
  }

  async function getBlobCrc(requestObj, node, payload) {
    if (payload) {
      node.debug('Running command to read blob crc')

      // crc request
      return await utils
        .request(node.url, 'POST', requestObj)
        .then(response => utils.checkIOLinkResponse(node, response))
        .then(response => {
          node.status({
            fill: 'green',
            shape: 'dot',
            text: 'Reading BLOB crc',
          })
          payload.crc = response.data.value
          return payload
        })
        .catch(error => {
          node.error(`Error while reading Blob crc : ${error}`)
          handleBlobTransferError(node, error)
        })
    }
  }

  async function stopBlobTransfer(node, payload) {
    if (payload) {
      node.debug('Running command to stop blob transfer')

      // stop
      var requestObj = {
        code: 10,
        cid: 1236,
        adr: node.writeAcyclicUrl,
        data: {
          index: 50,
          subindex: 0,
          value: 'F2',
        },
      }
      return await utils
        .request(node.url, 'POST', requestObj)
        .then(response => utils.checkIOLinkResponse(node, response))
        .then(() => {
          node.status({
            fill: 'blue',
            shape: 'dot',
            text: 'Stop BLOB transfer',
          })
          return payload
        })
        .catch(error => {
          node.error('Error while stopping blob transfer')
          handleBlobTransferError(node, error)
        })
    }
  }
}
