const fs = require('fs')
const path = require('path')
const debug = require('debug')('vms')
const {BackendVM, RPCServer} = require('libvms')

module.exports = {
  name: 'exec',
  help: `Run a backend script

Usage: nodevms exec [script] [-pd] [--dir path] [--utp]`,
  options: [
    { name: 'debug', abbr: 'd', boolean: true, help: 'debugmode' },
    { name: 'port', abbr: 'p', default: 5555, help: 'port to use for connections' },
    { name: 'dir', help: 'set the directory for the backend data' },
    { name: 'title', help: 'title of the backend, and of its resulting files archive' },
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
    var scriptCode
    try {
      scriptCode = fs.readFileSync(scriptPath, 'utf8')
    } catch (e) {
      console.error('ERROR: Failed to load', scriptPath)
      console.error(e.message)
      process.exit(1)
    }

    // set opts
    var dir = opts.dir
    if (!dir) {
      dir = `./${path.basename(scriptPath, '.js')}`
    }
    dir = path.resolve(dir)
    var title = opts.title
    if (!title) {
      title = `${path.basename(scriptPath)} files`
    }

    // initiate vm
    debug('evaluating backend vm')
    const backendVM = new BackendVM(scriptCode)
    await backendVM.deploy({dir, title})
    debug('backend script exports:', Object.keys(backendVM.exports))

    // init rpc server
    var rpcServer = new RPCServer(backendVM, {port: opts.port})
    await rpcServer.isReadyPromise
    console.log(`Serving at localhost:${opts.port}
Service directory ${dir}

Files    ${backendVM.filesArchive.url}
Call log ${backendVM.callLog.url}`)
  }
}
