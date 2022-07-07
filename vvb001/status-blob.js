var api = require('./api.js')
var utils = require('./utils.js')

module.exports = function (RED) {
  function getBlobStatus(config) {
    RED.nodes.createNode(this, config)

    this.ip = config.ip
    this.ipType = config.ipType || 'str'
    this.port = config.port

    var node = this
    node.on('input', function (msg) {
      node.processedIp = utils.parseInput(RED, node, msg, 'ip', 'ipType')
      node.processedPort = node.port
      node.url = `http://${node.processedIp}:80`
      node.readAcyclicUrl = `/iolinkmaster/port[${node.processedPort}]/iolinkdevice/iolreadacyclic`

      api.doGetBlobStatus(node).then(blobStatus => {
        node.status({
          fill: blobStatus.color,
          shape: 'dot',
          text: blobStatus.str,
        })
        if (typeof msg.payload == 'object') {
          msg.payload.blobStatus = blobStatus
        } else {
          msg.payload = { blobStatus: blobStatus }
        }
        node.send(msg)
      })
    })
  }

  RED.nodes.registerType('iolink-VVB001-status-blob', getBlobStatus)
}
