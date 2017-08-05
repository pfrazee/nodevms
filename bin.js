#!/usr/bin/env node

var subcommand = require('subcommand')
var debug = require('debug')('nodevms')
var usage = require('./lib/usage')

process.title = 'nodevms'

var config = {
  defaults: [],
  root: require('./lib/commands/exec'),
  none: usage,
  commands: [
    require('./lib/commands/exec'),
    require('./lib/commands/repl'),
    require('./lib/commands/verify'),
    require('./lib/commands/watch')
  ],
  usage: {
    command: usage,
    option: {
      name: 'help',
      abbr: 'h'
    }
  }
}

if (debug.enabled) {
  var pkg = require('./package.json')
  debug('nodevms', pkg.version)
  debug('node', process.version)
}

// Match Args + Run command
var match = subcommand(config)
match(process.argv.slice(2))
