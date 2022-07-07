const fetch = require('node-fetch')
const constants = require('./constants.js')

async function request(url, method, data) {
  const response = await fetch(url, {
    url: url,
    method: method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  if (response.ok) {
    if (response.status === 204) return
    return await response.json()
  }
  throw { status: response.status, message: await response.text() }
}

function checkIOLinkResponse(node, response, skip_errors = []) {
  if ('error' in response) {
    var errorDetail =
      JSON.stringify(constants.VVB001_ERROR_CODES[response.error]) || ''
    if (skip_errors.includes(response.error)) {
      node.debug(`Skipped error ${response.error}. ${errorDetail}`)
    } else {
      throw `IOLink responded with error : ${JSON.stringify(
        response,
      )} ${errorDetail}`
    }
  } else if ('code' in response && response.code >= 400) {
    node.debug(`IOLink responded with code ${response.code}`)
  }

  return response
}

function parseInt16(hex, littleEndian = false) {
  var data = hex.match(/../g)
  var buf = new ArrayBuffer(4)
  var view = new DataView(buf)

  data.forEach(function (b, i) {
    view.setUint8(i, parseInt(b, 16))
  })

  return view.getInt16(0, littleEndian)
}

function parseInput(RED, node, msg, input, inputType) {
  var processedInput
  try {
    switch (node[inputType]) {
      case 'msg':
        processedInput = RED.util.getMessageProperty(msg, node[input])
        break
      case 'flow':
        processedInput = node.context().flow.get(node[input])
        break
      case 'global':
        processedInput = node.context().global.get(node[input])
        break
      case 'str':
        processedInput = node[input].trim()
        break
      default:
        node.error(`Unrecognized Input Type, ${node[inputType]} for ${input}.`)
    }
    return processedInput
  } catch (err) {
    node.error(
      `Input property, ${node[inputType]}. ${node[input]}, does NOT exist.`,
    )
  }
}

module.exports = { request, parseInt16, checkIOLinkResponse, parseInput }
