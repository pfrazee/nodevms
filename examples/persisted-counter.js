exports.inc = async () => {
  var i = await read()
  i++
  await write(i)
  return i
}

async function read () {
  try { return await System.files.readFile('/counter') }
  catch (e) { return 0 }
}

async function write (i) {
  return await System.files.writeFile('/counter', '' + i)
}