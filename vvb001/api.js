var utils = require('./utils.js')

function doAbortBlob(node) {
  node.debug('Running command to abort blob transfer')
  var requestObj = {
    code: 10,
    cid: 1236,
    adr: node.writeAcyclicUrl,
    data: {
      index: 50,
      subindex: 0,
      value: 'F0', // Abort
    },
  }
  utils
    .request(node.url, 'POST', requestObj)
    // 8030 error code means that the parameter value is out of range.
    // This probably means there is no blob transfer to abort
    .then(response => utils.checkIOLinkResponse(node, response, ['8030']))
    .then(response => {
      if (response.code == 200) {
        node.log('Abort Blob transfer successful')
        node.status({
          fill: 'yellow',
          shape: 'dot',
          text: 'Abort successful',
        })
      }
    })
    .catch(error => {
      node.warn(`Error while aborting : ${error}`)
    })
}

async function doGetBlobStatus(node) {
  node.debug('Running command to get blob status')
  const statusData = { index: 49, subindex: 0 }
  //First we check the transmission status of the BLOB datablock

  var requestObj = {
    code: 10,
    cid: 1234,
    adr: node.readAcyclicUrl,
    data: statusData,
  }

  return await utils
    .request(node.url, 'POST', requestObj)
    .then(response => utils.checkIOLinkResponse(node, response))
    .then(response => {
      var statusHex = response.data.value
      var statusDec = utils.parseInt16(statusHex)

      let status = { hex: statusHex, dec: statusDec }

      status.color = 'grey'
      switch (statusDec) {
        case 0:
          status.str = 'Idle'
          break
        case -4096:
          status.str = 'Recording via BLOB-ID'
          status.color = 'green'
          break
        case -4097:
          status.str = 'Triggered recording via system command'
          status.color = 'green'
          break
        case -4098:
          status.str = 'Event-based recording'
          status.color = 'green'
          break
        case -4099:
          status.str = 'Triggered recording via PDOut'
          status.color = 'green'
          break
        default:
          status.str = `Unknown BLOB transmission status of ${statusDec}.`
          status.color = 'red'
          node.warn(`Unknown BLOB transmission status of ${statusDec}.`)
      }
      return status
    })
    .catch(error => {
      node.error('Error while fetching Blob status :' + error)
      return { str: undefined, color: undefined }
    })
}

module.exports = { doAbortBlob, doGetBlobStatus }
