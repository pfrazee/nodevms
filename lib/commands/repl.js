const NodeVMSClient = require('nodevms-client')
const repl = require('repl')

module.exports = {
  name: 'repl',
  help: `Connect to a backend server and execute commands in a REPL session

Usage: nodevms repl [url] [-u username]`,
  options: [
    { name: 'user', abbr: 'u', help: 'username to connect under' }
  ],
  command: async function (opts) {
    let url = opts._[0]
    if (!url) {
      console.error('ERROR: Must provide a url')
      process.exit(1)
    }
    if (!url.startsWith('ws')) {
      if (url.startsWith('localhost')) {
        // on localhost, default to insecure
        url = 'ws://' + url
      } else {
        // on remote, default to secure
        url = 'wss://' + url
      }
    }
    if (!url.endsWith('/')) {
      url += '/'
    }

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
    console.log('You can use \'client\' object to access the remote backend.')

    // start repl
    async function promiseEval (cmd, context, filename, cb) {
      try {
        var result = require('vm').runInNewContext(cmd, {client})
        if (result instanceof Promise) {
          result = await result
        }
        cb(null, result)
      } catch (e) {
        cb(e)
      }
    }
    const replInst = repl.start({prompt: '> ', eval: promiseEval})
  }
}