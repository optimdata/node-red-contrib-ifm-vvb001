var utils = require('./utils.js')

module.exports = function (RED) {
  function getData(config) {
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
      node.getDataUrl = `/iolinkmaster/port[${node.processedPort}]/iolinkdevice/pdin/getdata`

      var requestObj = { code: 'request', cid: 4, adr: node.getDataUrl }

      utils
        .request(node.url, 'POST', requestObj)
        .then(response => {
          var original = response.data.value
          let payload = {
            ts: new Date().toISOString(),
          }
          payload.v_Rms = utils.parseInt16(original.slice(0, 4)) * 0.0001 // word 0
          payload.a_Peak = utils.parseInt16(original.slice(8, 12)) * 0.1 // word 4
          payload.a_Rms = utils.parseInt16(original.slice(16, 20)) * 0.1 // word 8
          payload.Temperature = utils.parseInt16(original.slice(24, 28)) * 0.1 // word 12
          payload.Crest = utils.parseInt16(original.slice(32, 36)) * 0.1 // word 16
          payload.status = getDataStatus(original[38])

          if (typeof msg.payload == 'object') {
            msg.payload = { ...msg.payload, ...payload }
          } else {
            msg.payload = payload
          }
          send(msg)
          done()
        })
        .catch(error => {
          node.error(error)
        })
    })

    function getDataStatus(hex) {
      var statusStr

      switch (hex) {
        case '0':
          statusStr = 'OK'
          break
        case '1':
          statusStr = 'Maintenance Required'
          break
        case '2':
          statusStr = 'Out of Specification'
          break
        case '3':
          statusStr = 'Functional Check'
          break
        case '4':
          statusStr = 'Failure'
          break
        default:
          statusStr = 'Catastrophic Failure'
      }
      return statusStr
    }
  }

  RED.nodes.registerType('iolink-VVB001-get-data', getData)
}
