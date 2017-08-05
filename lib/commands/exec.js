
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
  command: function (opts) {
    if (opts.version) {
      var pkg = require('../../package.json')
      console.log(`nodevms ${pkg.version}`)
      process.exit(0)
    }

    console.log('TODO', opts)
  }
}
