const NodeVMSClient = require('nodevms-client')
const repl = require('repl')
const params = require('../params')

module.exports = {
  name: 'repl',
  help: `Connect to a backend server and execute commands in a REPL session

Usage: nodevms repl [url] [-u username]`,
  options: [
    { name: 'user', abbr: 'u', help: 'username to connect under' },
    { name: 'exec', abbr: 'e', help: 'single command to execute' },
  ],
  command: async function (opts) {
    let url = params.url(opts._[0])

    // connect to the server
    console.log(`Connecting to ${url} (user=${opts.user})...`)
    const client = new NodeVMSClient(url, {user: opts.user})
    try {
      await client.isReadyPromise
    } catch (e) {
      console.error('ERROR: Failed to connect to server')
      console.error(e.message)
      process.exit(1)
    }
    console.log('Connected.')

    // start repl
    async function promiseEval (cmd, context, filename, cb) {
      try {
        var result = require('vm').runInNewContext(cmd, {client})
        if (result instanceof Promise) {
          result = await result
        }
        cb(null, result)
      } catch (e) {
        if (e.code) {
          cb(new Error(e.message + ': ' + e.data))
        } else {
          cb(e)
        }
      }
    }
    if (opts.exec) {
      promiseEval(opts.exec, null, null, (err, res) => {
        if (err) console.error(err)
        else console.log(res)
        process.exit(0)
      })
    } else {
      console.log('You can use \'client\' object to access the remote backend.')
      const replInst = repl.start({prompt: '> ', eval: promiseEval})
    }
  }
}