module.exports = function (opts, help, usage) {
  if (opts.version) {
    var pkg = require('../package.json')
    console.error(pkg.version)
    process.exit(0)
  }
  var msg = `
Start a backend:
   nodevms exec [script] [-pd] [--dir path] [--title title] [--utp]

Audit a backend:
   nodevms verify [url] [--files url] [--log url] [--dir path]

Open a REPL session to a backend:
   nodevms repl [url] [-u username] [--exec cmd]

Troubleshooting & Help:
   nodevms help                    print this usage guide
   nodevms <command> --help, -h    print help for a specific command
   nodevms --version, -v           print the nodevms version
  `
  console.error(msg)
  console.error('Have fun using NodeVMS! Learn more at https://github.com/pfrazee/nodevms')
  process.exit(0)
}
