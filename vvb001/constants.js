//TODO complete error codes from the documentation

const IOLINK_MASTER_ERROR_CODES = {
  200: {
    text: 'OK',
    description: 'Request successfully processed',
  },
  531: {
    text: 'IO-Link error',
    description: 'Error in IO-Link master/device',
  },
}

const VVB001_ERROR_CODES = {
  8020: {
    text: 'Service temporarily not available',
    description:
      'Parameter is not accessible due to the current state of the device application',
  },
}

module.exports = { IOLINK_MASTER_ERROR_CODES, VVB001_ERROR_CODES }
