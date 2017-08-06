const assert = require('assert')
const deepEqual = require('deep-eql')
const dft = require('diff-file-tree')
const debug = require('debug')('nodevms')

exports.compareLogs = async function (logA, logB) {
  const [entriesA, entriesB] = await Promise.all([logA.list(), logB.list()])
  assert(entriesA.length === entriesB.length, 'Inequal number of call-log entries')
  assert(initEntriesEqual(entriesA, entriesB), 'Init entries do not match')
  for (let i = 1; i < entriesA.length; i++) {
    let entryA = entriesA[i]
    let entryB = entriesB[i]
    debug('checking entry', i)
    debug(entryA)
    debug(entryB)
    assert(deepEqual(entryA, entryB), `${i} entries do not match`)
  }
}

exports.compareArchives = async function (archiveA, archiveB) {
  var diffs = await dft.diff(
    {fs: archiveA._archive, path: '/'},
    {fs: archiveB._archive, path: '/'},
    {shallow: true, compareContent: true}
  )
  // filter out the dat.json difference, which is expected
  debug('files diff', diffs)
  diffs = diffs.filter(d => d.path !== '/dat.json')
  assert(diffs.length === 0, 'Differences were found between the files')
}

function initEntriesEqual (a, b) {
  if (a.type !== b.type) return false
  if (a.code !== b.code) return false
  return true
}