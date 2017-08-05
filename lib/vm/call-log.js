const hypercore = require('hypercore')
const concat = require('concat-stream')
const raf = require('random-access-file')
const debug = require('debug')('nodevms')

class CallLog {
  constructor (_hc) {
    this.hc = _hc
    this.url = `dat://` + _hc.key.toString('hex')
  }

  async append (obj) {
    await new Promise((resolve, reject) => {
      this.hc.append(JSON.stringify(obj), err => {
        if (err) reject(err)
        else resolve()
      })
    })
    console.log(await this.list())
  }

  appendInit({filesUrl}) {
    return this.append({
      type: 'init',
      filesArchiveUrl: filesUrl
    })
  }

  appendCall({userId, methodName, args, res, err, filesVersion}) {
    return this.append({
      type: 'call',
      call: {
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
      rs.pipe(concat({encoding: 'object'}, entries => {
        entries = entries.map(entry => {
          try {
            if (Buffer.isBuffer(entry)) {
              entry = entry.toString('utf8')
            }
            entry = JSON.parse(entry)
          } catch (e) {
            console.error('Error reading call log')
            console.error('  Entry:', entry)
            console.error('  Error:', e)
            process.exit(1)
          }
          return entry
        })
        resolve(entries)
      }))
    })
  }
}

exports.create = async function (dir, filesUrl) {
  debug('creating new call log at', dir)
  var hc = hypercore(storage(dir))
  await new Promise((resolve, reject) => {
    hc.on('ready', resolve)
    hc.on('error', reject)
  })
  var log = new CallLog(hc)
  await log.appendInit({filesUrl})
  return log
}

exports.open = async function (dir) {
  debug('opening existing call log at', dir)
  var hc = hypercore(storage(dir))
  await new Promise((resolve, reject) => {
    hc.on('ready', resolve)
    hc.on('error', reject)
  })
  return new CallLog(hc)
}

function storage (directory) {
  return filename => {
    return raf('call-log.' + filename, {directory})
  }
}