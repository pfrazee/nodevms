
module.exports = {
  name: 'repl',
  help: `Connect to a backend server and execute commands in a REPL session

Usage: nodevms repl [url] [-u username]`,
  options: [
    { name: 'user', abbr: 'u', help: 'username to connect under' }
  ],
  command: function (opts) {
    console.log('TODO', opts)
  }
}
