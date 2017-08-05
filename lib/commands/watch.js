
module.exports = {
  name: 'watch',
  help: `Connect to a backend server and continuosly verify that the current state matches the output state

Usage: nodevms watch [url] [--files url] [--log url] [--dir path]`,
  options: [
    { name: 'files', help: 'expected url of the backend files archive' },
    { name: 'log', help: 'expected url of the backend call log' },
    { name: 'dir', help: 'set the directory for the backend data' },
    { name: 'utp', default: true, boolean: true, help: 'use utp for discovery' }
  ],
  command: function (opts) {
    console.log('TODO', opts)
  }
}
