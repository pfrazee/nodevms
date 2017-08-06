const hypercore = require('hypercore')
const concat = require('concat-stream')
const raf = require('random-access-file')
const ram = require('random-access-memory')
const swarmDefaults = require('dat-swarm-defaults')
const disc = require('discovery-swarm')
const debug = require('debug')('nodevms')
const params = require('../params')

const DEFAULT_PORT = 3282

class CallLog {
  constructor (_hc) {
    this.hc = _hc
    this.url = `dat://` + _hc.key.toString('hex')
  }

  get length () {
    return this.hc.length
  }

  async append (obj) {
    debug('call log appending', obj)
    await new Promise((resolve, reject) => {
      this.hc.append(obj, err => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  appendInit({code, filesArchiveUrl}) {
    return this.append({
      type: 'init',
      filesArchiveUrl,
      code
    })
  }

  appendCall({userId, methodName, args, res, err, filesVersion}) {
    return this.append({
      type: 'call',
      call: {
        userId,
        methodName,
        args
      },
      result: {
        res,
        err: err ? err.name || err.message : undefined,
        filesVersion
      }
    })
  }

  list ({start, end} = {}) {
    return new Promise((resolve, reject) => {
      const rs = this.hc.createReadStream({start, end})
      rs.on('error', reject)
      rs.pipe(concat({encoding: 'object'}, resolve))
    })
  }
}

exports.create = async function (dir, code, filesArchiveUrl) {
  debug('creating new call log at', dir)
  var hc = hypercore(storage(dir), {valueEncoding: 'json'})
  await new Promise((resolve, reject) => {
    hc.on('ready', resolve)
    hc.on('error', reject)
  })
  joinSwarm(hc)
  var log = new CallLog(hc)
  await log.appendInit({code, filesArchiveUrl})
  return log
}

exports.open = async function (dir) {
  debug('opening existing call log at', dir)
  var hc = hypercore(storage(dir), {valueEncoding: 'json'})
  await new Promise((resolve, reject) => {
    hc.on('ready', resolve)
    hc.on('error', reject)
  })
  joinSwarm(hc)
  return new CallLog(hc)
}

exports.fetch = async function (url, dir) {
  var key = params.datUrlToKey(url)
  debug('fetching existing call log, storing to', dir || 'memory')
  debug('key is', key)
  var hc = hypercore(dir ? storage(dir) : memory, key, {valueEncoding: 'json'})
  await new Promise((resolve, reject) => {
    hc.on('ready', resolve)
    hc.on('error', reject)
  })
  joinSwarm(hc)
  await new Promise((resolve, reject) => {
    hc.on('sync', resolve)
    hc.on('error', reject)
  })
  return new CallLog(hc)
}

function joinSwarm (hc) {
  var swarm = disc(swarmDefaults({
    hash: false,
    stream: peer => {
      var stream = hc.replicate({
        upload: true,
        download: true,
        live: true
      })
      // stream.on('close', function () {
      //   debug('replication stream closed')
      // })
      // stream.on('error', function (err) {
      //   debug('replication error:', err.message)
      // })
      // stream.on('end', function () {
      //   debug('replication stream ended')
      // })
      return stream
    }
  }))
  swarm.once('error', function () {
    swarm.listen(0)
  })
  swarm.listen(DEFAULT_PORT) // this is probably colliding with the files archive
  swarm.join(hc.discoveryKey, { announce: true })
}

function storage (directory) {
  return filename => {
    return raf('call-log.' + filename, {directory})
  }
}

function memory (filename) {
  return ram()
}