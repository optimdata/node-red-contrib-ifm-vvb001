var api = require('./api.js')
var utils = require('./utils.js')

module.exports = function (RED) {
  function abortBlob(config) {
    RED.nodes.createNode(this, config)

    this.ip = config.ip
    this.ipType = config.ipType || 'str'
    this.port = config.port

    var node = this

    node.on('input', function (msg) {
      node.processedIp = utils.parseInput(RED, node, msg, 'ip', 'ipType')
      node.processedPort = node.port
      node.url = `http://${node.processedIp}:80`
      node.writeAcyclicUrl = `/iolinkmaster/port[${node.processedPort}]/iolinkdevice/iolwriteacyclic`

      api.doAbortBlob(node)
    })
  }
  RED.nodes.registerType('iolink-VVB001-abort-blob', abortBlob)
}
