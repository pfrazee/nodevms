exports.write = async function (name, value) {
  await System.files.writeFile(name, value)
}

exports.read = async function (name) {
  return await System.files.readFile(name)
}