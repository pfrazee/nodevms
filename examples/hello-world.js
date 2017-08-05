exports.helloWorld = () => {
  if (Backend.callerId) {
    return 'Hello, ' + Backend.callerId + '!'
  }
  return 'Hello, world!'
}