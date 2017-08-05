exports.url = function (url) {
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
  return url
}

exports.datUrlToKey = function (url) {
  var match = /[0-9a-f]{64}/i.exec(url)
  return match ? match[0] : null
}