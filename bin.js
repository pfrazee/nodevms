#!/usr/bin/env node

const subcommand = require('subcommand')
const debug = require('debug')('nodevms')
const usage = require('./lib/usage')

process.title = 'nodevms'

const config = {
  defaults: [],
  root: require('./lib/commands/exec'),
  none: usage,
  commands: [
    require('./lib/commands/exec'),
    require('./lib/commands/repl'),
    require('./lib/commands/verify')
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
  const pkg = require('./package.json')
  debug('nodevms', pkg.version)
  debug('node', process.version)
}

// Match Args + Run command
const match = subcommand(config)
match(process.argv.slice(2))
