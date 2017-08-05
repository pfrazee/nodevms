const WebSocketServer = require('rpc-websockets').Server
const DEFAULT_PORT = 5555

class RPCServer {
  constructor (backendVM, opts={}) {
    this.server = new WebSocketServer({
      port: opts.port || DEFAULT_PORT
    })
    this.registerCommands(backendVM)
    this.isReadyPromise = new Promise((resolve, reject) => {
      this.server.on('listening', resolve)
      this.server.on('error', reject)
    })
  }

  registerCommands (backendVM) {
    // register all exported commands
    let methods = []
    for (let methodName in backendVM.exports) {
      if (typeof backendVM.exports[methodName] !== 'function') {
        continue
      }
      let method = backendVM.exports[methodName]
      this.server.register(methodName, args => method.apply(backendVM, args))
      methods.push(methodName)
    }
    // register standard methods
    this.server.register('handshake', () => {
      return {methods}
    })
  }
}
module.exports = RPCServer