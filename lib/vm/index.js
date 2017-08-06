const vm = require('vm')
const path = require('path')
const fs = require('fs')
const DatArchive = require('node-dat-archive')
const tempy = require('tempy')
const debug = require('debug')('nodevms')
const RPCServer = require('./rpc-server')
const CallLog = require('./call-log')
const sandboxifyDatArchive = require('./sandboxify-dat-archive')

class BackendVM {
  constructor (code) {
    this.code = code
    this.script = null
    this.sandbox = null
    this.context = null
    this.filesArchive = null
    this.callLog = null
    this.hasEvaluated = false
  }

  evaluate () {
    if (this.hasEvaluated) {
      throw new Error('This backend has already been evaluated')
    }
    this.script = new vm.Script(this.code)
    this.sandbox = createNewSandbox(this)
    this.context = new vm.createContext(this.sandbox)
    this.script.runInContext(this.context)
    this.hasEvaluated = true
  }

  get exports () {
    return this.sandbox.exports
  }

  initRPCServer (opts) {
    return new RPCServer(this, opts)
  }

  async initFilesArchive ({dir, title, url}) {
    var meta = readMetaFile(dir)
    if (meta && meta.url) {
      // check the url, if given
      if (url && meta.url !== url) {
        console.error('Mismatched files archive URL.')
        console.error(`   Expected: ${url}`)
        console.error(`   Found: ${meta.url}`)
        process.exit(1)
      }
      // files archive already exists
      debug('opening existing files directory at', dir)
      this.filesArchive = new DatArchive(meta.url, {localPath: dir})
      await this.filesArchive._loadPromise
      this.callLog = await CallLog.open(dir)
    } else {
      // new files archive
      debug('creating new files directory at', dir)
      this.filesArchive = await DatArchive.create({
        localPath: dir,
        title
      })
      this.callLog = await CallLog.create(dir, this.code, this.filesArchive.url)
      writeMetaFile(dir, {title, url: this.filesArchive.url})
    }
  }

  async executeCall ({methodName, args, userId}) {
    this.sandbox.Backend.callerId = userId
    var res, err
    try {
      res = await this.sandbox.exports[methodName](...args)
    } catch (e) {
      err = e
    }
    await this.callLog.appendCall({
      userId: userId,
      methodName,
      args,
      res,
      err,
      filesVersion: this.filesArchive._archive.version
    })
    if (err) {
      throw err
    }
    return res
  }

  static async fromCallLog (callLog, assertions, {dir} = {}) {
    dir = dir || tempy.directory()

    // read the log
    const entries = await callLog.list()

    // handle init
    const initMsg = entries.shift()
    debug('init message', initMsg)
    if (initMsg.type !== 'init') {
      throw new Error(`Malformed call log: Expected "init" message, got ${initMsg.type}`)
    }
    if (initMsg.filesArchiveUrl !== assertions.filesUrl) {
      throw new Error(`Mismatched files archive URLs. Call log asserts ${initMsg.filesArchiveUrl}, server asserts ${assertions.filesUrl}`)
    }
    const backendVM = new BackendVM(initMsg.code)
    await backendVM.initFilesArchive({dir, title: 'Replay'})
    backendVM.evaluate()
    debug('backend script exports:', Object.keys(backendVM.exports))

    // replay all remaining messages
    for (let i = 0; i < entries.length; i++) {
      let msg = entries[i]
      debug('replaying message', msg)
      if (msg.type !== 'call') {
        debug('unknown message type,', msg.type)
      }
      let {userId, methodName, args} = msg.call
      let res, err
      try {
        res = await backendVM.executeCall({methodName, args, userId})
      } catch (e) {
        err = e
      }
    }
    
    return backendVM
  }
}

function readMetaFile (dir) {
  // check the dir exists
  var stat
  try {
    stat = fs.statSync(dir)
  } catch (e) {
    return false
  }
  if (!stat.isDirectory()) {
    throw new Error('Target directory path is not a directory')
  }
  // load the meta.json
  try {
    var datJson = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'))
  } catch (e) {
    return false
  }
  return datJson
}

function writeMetaFile (dir, content) {
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(content))
}

function createNewSandbox (self) {
  var exports = {}
  return {
    // exports
    module: {exports},
    exports,

    // nodevms apis
    Backend: {
      callerId: false, // set on each invocation
      files: sandboxifyDatArchive(self.filesArchive),
      oracle: false // TODO
    },

    // builtin apis
    console,
    Buffer,
    setImmediate,
    setInterval,
    setTimeout,
    clearImmediate,
    clearInterval,
    clearTimeout
  }
}

module.exports = BackendVM