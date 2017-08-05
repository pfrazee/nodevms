const jetpack = require('fs-jetpack')
const debug = require('debug')('nodevms')
const BackendVM = require('../vm')

// DEBUG
const NodeVMSClient = require('nodevms-client')

module.exports = {
  name: 'exec',
  help: `Run a backend script

Usage: nodevms exec [script] [-pd] [--dir path] [--utp]`,
  options: [
    { name: 'debug', abbr: 'd', boolean: true, help: 'debugmode' },
    { name: 'port', abbr: 'p', default: 5555, help: 'port to use for connections' },
    { name: 'dir', help: 'set the directory for the backend data' },
    { name: 'utp', default: true, boolean: true, help: 'use utp for discovery' },
    { name: 'version', boolean: true, abbr: 'v' }
  ],
  command: async function (opts) {
    // -v / --version
    if (opts.version) {
      var pkg = require('../../package.json')
      console.log(`nodevms ${pkg.version}`)
      process.exit(0)
    }

    // read script
    const scriptPath = opts._[0]
    debug('loading script', scriptPath)
    const scriptCode = jetpack.read(scriptPath)

    // initiate vm
    debug('evaluating backend vm')
    const backendVM = new BackendVM(scriptCode)
    backendVM.evaluate()
    debug('backend script exports:', Object.keys(backendVM.exports))

    // init rpc server
    var rpcServer = backendVM.initRPCServer({port: opts.port})
    await rpcServer.isReadyPromise
    console.log(`Serving at localhost:${opts.port}`)

    // DEBUG
    console.log('connecting...')
    var rpc = new NodeVMSClient('ws://localhost:5555/', {user: 'bob'})
    await rpc.isReadyPromise
    console.log(await rpc.helloWorld())
  }
}
