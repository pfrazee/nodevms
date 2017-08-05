exports.write = async function (name, value) {
  await Backend.files.writeFile(name, value)
}

exports.read = async function (name) {
  return await Backend.files.readFile(name)
}