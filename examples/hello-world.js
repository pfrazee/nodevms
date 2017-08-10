exports.helloWorld = () => {
  if (System.caller.id) {
    return 'Hello, ' + System.caller.id + '!'
  }
  return 'Hello, world!'
}