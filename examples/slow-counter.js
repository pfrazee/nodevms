var i = 0
exports.inc = async () => {
  await new Promise(resolve => setTimeout(resolve, 1e3))
  return i++
}