const fs = System.files

// keyserver.js
exports.init = async () => {
  await fs.mkdir('/keys')
}

// key management
// =

exports.setKey = async (name, pubkey) => {
  // validate parameters
  assert(name && typeof name === 'string', 'Name param must be a string')
  assert(pubkey && typeof pubkey === 'string', 'Pubkey param must be a string')

  // validate perms
  var admins = await getAdmins()
  assertCallerIsAdmin(admins)

  // write the key binding as a file
  await fs.writeFile(`/keys/${name}`, pubkey)
}

exports.delKey = async (name) => {
  // validate parameters
  assert(name && typeof name === 'string', 'Name param must be a string')

  // validate perms
  var admins = await getAdmins()
  assertCallerIsAdmin(admins)

  // delete the file
  await fs.unlink(`/keys/${name}`)
}

// admin controls
// =

// method to set the admins of this key server
// - expects [{id: String, name: String}, ...]
exports.setAdmins = async (newAdmins) => {
  var existAdmins = await getAdmins()
  assertValidAdminArray(existAdmins)
  assertCallerIsAdmin(existAdmins)
  await fs.writeFile('/admins', JSON.stringify(newAdmins))
}

// helper to fetch the current admins
async function getAdmins () {
  try { return JSON.parse(await fs.readFile('/admins')) }
  catch (e) { console.error('nope', e); return [] }
}

// helper to validate the admins array
function assertValidAdminArray (admins) {
  assert(Array.isArray(admins), 'Admins must be an array')
  admins.forEach(admin => {
    assert(typeof admin === 'object', 'Admin items must be a {id:, name:}')
    assert(admin.id && typeof admin.id === 'string', 'Admin items must be a {id:, name:}')
    assert(admin.name && typeof admin.name === 'string', 'Admin items must be a {id:, name:}')
  })
}

// throw if the given caller is not an admin
function assertCallerIsAdmin (admins) {
  if (!admins || admins.length === 0) {
    return true // no admins yet, allowed
  }
  assert(admins.find(a => a.id === System.caller.id), 'Not allowed')
}

function assert (cond, err) {
  if (!cond) throw new Error(err)
}