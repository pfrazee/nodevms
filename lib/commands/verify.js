const {RPCClient, VM, CallLog, Verifier} = require('libvms')
const DatArchive = require('node-dat-archive')
const chalk = require('chalk')
const figures = require('figures')
const debug = require('debug')('vms')
const params = require('../params')

module.exports = {
  name: 'verify',
  help: `Connect to a backend server and verify that the current state matches the output state

Usage: nodevms verify [url] [--files url] [--log url] [--dir path]`,
  options: [
    { name: 'files', help: 'expected url of the backend files archive' },
    { name: 'log', help: 'expected url of the backend call log' },
    { name: 'dir', help: 'set the directory for the backend data' },
    { name: 'utp', default: true, boolean: true, help: 'use utp for discovery' }
  ],
  command: async function (opts) {
    const url = params.url(opts._[0])

    // connect to the server
    console.log(`${chalk.gray(figures.pointerSmall)}Connecting to ${url}...`)
    const client = new RPCClient()
    try {
      await client.connect(url)
    } catch (e) {
      console.error('ERROR: Failed to connect to server')
      console.error(e.message)
      process.exit(1)
    }
    console.log(`${chalk.gray(figures.pointerSmall)}Connected.`)

    // fetch the call log
    console.log(`${chalk.gray(figures.pointerSmall)}Downloading call log...`)
    debug('backend info', client.backendInfo)
    const callLog = await CallLog.fetch(client.backendInfo.callLogUrl, opts.dir)

    // fetch the dat archive
    console.log(`${chalk.gray(figures.pointerSmall)}Downloading files archive...`)
    const filesArchive = new DatArchive(client.backendInfo.filesArchiveUrl)
    await filesArchive.download('/')

    // replay the call log
    console.log(`${chalk.gray(figures.pointerSmall)}Replaying %d calls...`, callLog.length)
    const backendVM = await VM.fromCallLog(callLog, client.backendInfo, {dir: opts.dir})

    // compare outputs
    console.log(`${chalk.gray(figures.pointerSmall)}Comparing outputs...`)
    try {
      await Verifier.compareLogs(callLog, backendVM.callLog)
      console.log(chalk.green(`${figures.tick}Call log verified.`))
    } catch (e) {
      console.error(chalk.red(`${figures.cross}Call log mismatch.`))
      console.error('   Error:', e)
      process.exit(1)
    }
    try {
      await Verifier.compareArchives(filesArchive, backendVM.filesArchive)
      console.log(chalk.green(`${figures.tick}Output files verified.`))
    } catch (e) {
      console.error(chalk.red(`${figures.cross}Output files mismatch.`))
      console.error('   Error:', e)
      process.exit(1)
    }

    process.exit(0)
  }
}
