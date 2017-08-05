const WebSocketServer = require('rpc-websockets').Server
const debug = require('debug')('nodevms')
const DEFAULT_PORT = 5555
const MAX_QUEUE_LENGTH = 1e3

class RPCServer {
  constructor (backendVM, opts={}) {
    // setup the WebSocket server
    this.backendVM = backendVM
    this.server = new WebSocketServer({
      port: opts.port || DEFAULT_PORT
    })
    this.isReadyPromise = new Promise((resolve, reject) => {
      this.server.on('listening', resolve)
      this.server.on('error', reject)
    })

    // establish the method handlers
    this.registerCommands()
    this.callQueue = [] // backlog of RPC requests
    this.activeCall = null // call currently being processed
  }

  registerCommands () {
    // register all exported commands
    let methods = []
    for (let methodName in this.backendVM.exports) {
      let method = this.backendVM.exports[methodName]
      if (typeof method === 'function') {
        this.server.register(methodName, (args, meta) => this.queueRPCCall(methodName, args, meta))
        methods.push(methodName)
      }
    }

    // register standard methods
    this.server.register('handshake', () => {
      return {methods}
    })
  }

  queueRPCCall (methodName, args, meta) {
    debug('got call', methodName, args, meta)
    if (this.callQueue.length > MAX_QUEUE_LENGTH) {
      throw new Error('Too many active requests. Try again in a few minutes.')
    }

    // add the call to the queue and then process the queue
    var promise = new Promise((resolve, reject) => {
      this.callQueue.push({
        resolve,
        reject,
        methodName,
        args,
        meta
      })
    })
    this.kickCallQueue()
    return promise
  }

  async kickCallQueue () {
    if (this.activeCall) {
      return // already handling a call
    }
    if (!this.callQueue.length) {
      return // no queued calls
    }
    // run the top call on the queue
    this.activeCall = this.callQueue.shift()
    debug('handling call', this.activeCall)
    try {
      this.activeCall.resolve(await this.backendVM.executeCall(this.activeCall))
    } catch (e) {
      this.activeCall.reject(e)
    }
    this.activeCall = null
    // continue to the next call
    this.kickCallQueue()
  }
}
module.exports = RPCServer