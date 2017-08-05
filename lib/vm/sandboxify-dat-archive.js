const WHITELIST = [
  'getInfo',
  'stat',
  'readFile',
  'readdir',
  'writeFile',
  'mkdir',
  'unlink',
  'rmdir',
  'history'
]

module.exports = function (archive) {
  var wrapper = {}
  WHITELIST.forEach(k => {
    wrapper[k] = (...args) => archive[k](...args)
  })
  return wrapper
}