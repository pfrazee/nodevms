# RecordRun

A cryptographically auditable smart contract service written with nodejs and [dat](https://github.com/datproject/dat).

Background reading:

 - [What is the Dat protocol?](https://beakerbrowser.com/docs/inside-beaker/)
 - [Can we create a smart contract VM on nodejs using Dat?](https://gist.github.com/pfrazee/bf13db9dea21936af320c512811c2a2b)

**This project is a proof-of-concept and doesnt run yet. When I wrote this disclaimer, it was just a README.**


## Tutorial

Our "smart contract" is a typical nodejs script.

```js
// counter.js
var i = 0
exports.increment = function () {
  i++
  return i
}
```

It exports methods which can be called remotely. The script is executed from the commandline:

```bash
recordrun -e ./counter.js
```

This execution would emit the following information:

```bash
recordrun v1.0.0
Serving at localhost:5555
Serving directory /home/bob/counter
Files:    dat://17f29b83be7002479d8865dad3765dfaa9aaeb283289ec65e30992dc20e3dabd
Call log: dat://7081814137ea43fc32348e2259027e94e85c7b395e6f3218e5f5cb803cc9bbef

0 connections | Download 0 B/s Upload 0 B/s

Waiting for RPC connections


Ctrl+C to Exit
```

A client will now connect using websockets to make calls. We will use the recordrun JS repl to do so.

```bash
recordrun -r localhost:5555
```

The session namespace will be populated with a `rpc` object which calls out to the live contract.

```js
> rpc.increment() // promises are automatically awaited by the repl
1
> rpc.increment()
2
> rpc.increment()
3
```

Great! We have a smart-contract that maintains a counter for us. There's only one problem: the state isn't being persisted anywhere! If I restart recordrun, the counter will reset to zero.

To fix that, we need to persist state to the contract's files archive.

```js
const fs = contract.filesDat

exports.increment = async function () {
  var i = await fs.readFile('/counter', 'json')
  i++
  await fs.writeFile('/counter', i)
  return i
}
```

Now, the counter state will persist after restarting the contract.

The files dat-archive provides a sandboxed folder for keeping state. Its interface can be found on the global `contract` object, as `contract.filesDat`.

You can share the contract's files dat-archive. In fact, this is the recommended way to have people read the output of of the contract. Its URL is emitted at start:

```
Files:    dat://17f29b83be7002479d8865dad3765dfaa9aaeb283289ec65e30992dc20e3dabd
```

An example of how you might use the files dat-archive is, you might write a contract to maintain a photo album. The contract code would simply provide an interface for writing the images:

```js
const fs = contract.filesDat
exports.addPhoto = async function (name, data, encoding) {
  const path = `/photos/${name}`
  var alreadyExists = false
  try {
    await fs.stat(path)
    alreadyExists = true
  } catch (e) {}
  if (alreadyExists) throw new Error('File already exists')
  await fs.writeFile(path, data, encoding)
}
```

This contract would ensure that each name for a photo can be taken once-and-only-once.

> **Race condition?** Under the normal design for Javascript, this contract would have a race-condition if two `addPhoto()` calls occurred at the same time for the same `name`. However, Recordrun only executes one call at a time; all other calls are queued until the active call returns. This is called a "contract-wide lock." The contract-wide lock is very inefficient, but it improves the replayability of the contract.

### The contract files dat-archive

The current state of the files dat-archive is available on the FS of the RecordRun server. Its location is also emitted at the start (the "Serving directory") and it can be configured via cli opts:

```
recordrun -e ./counter.js ./my-counter-files
```

If you examine the files dat-archive, you will find:

 - a copy of the contract script at `./contract.js`,
 - metadata about the contract and its files archive at `./dat.json`, and
 - a `.dat` folder, which contains the internal datastructures of the files dat-archive and the calls dat-log.

**Never change the content of the files dat!!** Clients of your contract *will* detect the difference and lose trust in your server.

### JS client

You can programmatically connect to a RecordRun contract using `recordrun-client`:

```js
var RRC = require('recordrun-client')
var contract = await RRC.connect('localhost:5555')
console.log(await contract.increment())
```

The contract object will have all of the methods exported by the contract. Each method returns a promise, and can take any number of arguments.

### Verifying the state of a contract

Each contract executed by RecordRun publishes a call log using dat. This call log can be replayed using RecordRun to verify the state of the files dat-archive.

```bash
recordrun -v localhost:5555
```

Optionally, you can include the urls of the expected files archive and dat log:

```bash
recordrun -v localhost:5555 \
  --files dat://17f29b83be7002479d8865dad3765dfaa9aaeb283289ec65e30992dc20e3dabd \
  --log dat://7081814137ea43fc32348e2259027e94e85c7b395e6f3218e5f5cb803cc9bbef
```

Your RecordRun client will download the call log and the current files archive, then replay the history to confirm the output state. If it does not match, RecordRun will alert you to the disparity.

If you provide a storage directory, the verifier will continue running after the initial check and live-stream updates. The datasets will be persisted and rehosted on the dat network.

```bash
recordrun -v localhost:5555 \
  --out ./trusty-bobs-counters-contract \
  --files dat://17f29b83be7002479d8865dad3765dfaa9aaeb283289ec65e30992dc20e3dabd \
  --log dat://7081814137ea43fc32348e2259027e94e85c7b395e6f3218e5f5cb803cc9bbef
```

### Users & authentication

The contract provides information about the calling user, in order to make permissions decisions. The user's id is located on the `this` object, as `this.callerId`. Here's a simple example usage of permissions:

```js
// secure-counter.js
var ownerId
exports.init = () => {
  if (ownerId) throw new Error('I already have an owner!')
  ownerId = this.callerId
}
var counter = 0
exports.increment = () => {
  if (this.callerId !== ownerId) throw new Error('You are not my owner!')
  return counter++
}
```

This contract provides a counter which only the owner can increment. (The owner is established as the first user to connect and call `init()`.) The call log will note the caller ID for ever call, along with a signature of the call data.

When debugmode is on, you can set the calledId using the Basic Auth header when connecting to the server's websocket. For example:

```
recordrun -e ./secure-counter.js --debug

# in another term, the repl call:
recordrun -r localhost:5555 --user bob
```

**NOTE: The current version of RecordRun does not have production authentication implemented.** Only the debugmode authentication is available.

### Calling out of the contract and accessing "Oracles"

The current version of RecordRun does not let the contract-script access other processes, the network, or the FS (other than the files dat-archive). This is for two reasons:

 1. It's safer to run untrusted contracts if they are sandboxed, and
 2. It encourages deterministic contracts.

This means you cannot contact "Oracles" at this time.

**About nondeterminism.** There is currently no way to model indeterminism in RecordRun. If your contract's effects are not fully deterministic, then there is some chance that verification will fail.

This is an example of a simple non-deterministic contract:

```js
const fs = contract.filesDat
module.exports = async function () {
  var value = Math.random() // ignore the fact that we could seed this random
  fs.writeFile('/latest', value)
  return value
}
```

Both the return value and the files state is not replayable in this contract, and so a verifier would fail.

In the future, there will be a way to record non-determinism -- essentially by wrapping the effectful areas of code. It will look something like this:

```js
const fs = contract.filesDat
module.exports = async function () {
  var value = await contract.oracle(() => Math.random())
  fs.writeFile('/latest', value)
  return value
}
```

The `contract.oracle()` wrapper will effectively [memoize](https://en.wikipedia.org/wiki/Memoization) the return value so that replays of the log can use the same values, and not call the internal logic.