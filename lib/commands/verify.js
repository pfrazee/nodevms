const NodeVMSClient = require('nodevms-client')
const debug = require('debug')('nodevms')
const params = require('../params')
const CallLog = require('../vm/call-log')

module.exports = {
  name: 'verify',
  help: `Connect to a backend server and verify that the current state matches the output state

Usage: nodevms verify [url] [--files url] [--log url] [--dir path]`,
  options: [
    { name: 'files', help: 'expected url of the backend files archive' },
    { name: 'log', help: 'expected url of the backend call log' },
    { name: 'dir', help: 'set the directory for the backend data' },
    { name: 'utp', default: true, boolean: true, help: 'use utp for discovery' }
  ],
  command: async function (opts) {
    const url = params.url(opts._[0])

    // connect to the server
    console.log(`Connecting to ${url}...`)
    const client = new NodeVMSClient(url)
    try {
      await client.isReadyPromise
    } catch (e) {
      console.error('ERROR: Failed to connect to server')
      console.error(e.message)
      process.exit(1)
    }
    console.log('Connected.')

    // fetch the call log
    console.log('Downloading call log...')
    debug('backend info', client.backendInfo)
    var callLog = await CallLog.fetch(client.backendInfo.callLogUrl, opts.dir)
    console.log('Downloaded %d entries.', callLog.hc.length)
    console.log(await callLog.list())
  }
}
