# NodeVMS

A cryptographically auditable VM service using Nodejs and [Dat](https://github.com/datproject/dat).

Background reading:

 - [What is the Dat protocol?](https://beakerbrowser.com/docs/inside-beaker/)
 - [Can we create a smart contract VM on nodejs using Dat?](https://gist.github.com/pfrazee/bf13db9dea21936af320c512811c2a2b)

**This project is a proof-of-concept and doesnt run yet. When I wrote this disclaimer, it was just a README.**


## Motivation

With the [Beaker Browser](https://beakerbrowser.com), we're creating a decentralized and p2p networking stack for browser applications. Our goal is to execute applications without corporate services, so that users can own their data and their software.

Currently our stack consists of:

 - The [DatArchive API](https://beakerbrowser.com/docs/apis/dat.html) for publishing files globally and securely
 - The [InJest DB](https://github.com/beakerbrowser/injestdb) for publishing and querying tables globally and securely

These APIs are peer-to-peer. They provide a weak form of data consensus called [eventual consistency](https://en.wikipedia.org/wiki/Eventual_consistency). This means, among other things, they can not provide [ACID transactions](https://en.wikipedia.org/wiki/ACID). For transactions, we need [sequential consistency](https://en.wikipedia.org/wiki/Consistency_model#Sequential_Consistency).

Many teams in the Web 3.0 movement have turned to blockchains in order to provide sequential consistency. However, blockchains are not efficient enough for our purposes. They have very poor throughput, burn excess cycles for Proof-of-Work, and require upfront payment to execute operations. (Blockchains may be a fast way to make money, but they are not a fast way to run computers.)

NodeVMS is designed to provide the same benefits of a blockchain VM (ie Ethereum) but with multiple orders-of-magnitude better throughput. NodeVMS provides:

 - Easy deployment of backend scripts on any NodeVMS host.
 - High transaction throughput (TODO: put a bench here).
 - Trustless execution of the backend through cryptographic auditing (you do not need to trust the NodeVMS host).
 - Transactions and [sequential consistency](https://en.wikipedia.org/wiki/Consistency_model#Sequential_Consistency).

[You can read about the justification for NodeVMS in this post](https://gist.github.com/pfrazee/bf13db9dea21936af320c512811c2a2b).


## Tutorial

A "backend script" is a self-contained nodejs module. It is given limited `require()` access.

```js
// counter.js
var i = 0
exports.increment = function () {
  i++
  return i
}
```

It exports methods which can be called. NodeVMS exposes these methods over a WebSocket RPC.

To serve the backend script, we use the commandline:

```bash
$ nodevms -e ./counter.js
nodevms v1.0.0
Serving at localhost:5555
Serving directory /home/bob/counter

Files:    dat://17f29b83be7002479d8865dad3765dfaa9aaeb283289ec65e30992dc20e3dabd
Call log: dat://7081814137ea43fc32348e2259027e94e85c7b395e6f3218e5f5cb803cc9bbef

0 connections | Download 0 B/s Upload 0 B/s

Waiting for RPC connections


Ctrl+C to Exit
```

Clients can now connect and call to the backend!

Let's use the NodeVMS REPL to do so:

```bash
$ nodevms -r localhost:5555
Connecting...
Connected.
You can use 'client' object to access the backend.
> client.increment()
1
> client.increment()
2
> client.increment()
3
```

Great! We have a backend service that maintains a counter for us. We can increment the counter by calling its exported method `increment()`.

### Persisting state to the files dat-archive

There's only one problem: the state isn't being persisted anywhere. If I were to restart NodeVMS, the counter will reset to zero. That isn't very useful.

To fix that, we need to persist state to the backend's files archive.

```js
// persistent-counter.js
const fs = System.files
exports.increment = async function () {
  var i = await fs.readFile('/counter', 'json')
  i++
  await fs.writeFile('/counter', i)
  return i
}
```

Now, the counter state will persist after restarting the backend script.

The files dat-archive provides a sandboxed folder for keeping state. Its interface can be found on the global `System` object as `System.files`.

You can share the backend's files dat-archive. In fact, that is the recommended way to have people read the state of the backend! Its URL is emitted at start:

```
Files:    dat://17f29b83be7002479d8865dad3765dfaa9aaeb283289ec65e30992dc20e3dabd
```

An example of how you might use the files dat-archive is, you might write a backend to maintain a photo album. The backend script would simply provide an API for writing the images:

```js
const fs = System.files
exports.addPhoto = async function (name, data, encoding) {
  const path = `/photos/${name}`
  var alreadyExists = await doesFileExist(path)
  if (alreadyExists) throw new Error('File already exists')
  await fs.writeFile(path, data, encoding)
}
async function doesFileExist (path) {
  try {
    await fs.stat(path)
    return true
  } catch (e) {
    return false
  }
}
```

This backend would ensure that each name for a photo can be taken once-and-only-once.

> **Race condition?** Under the normal execution of a Javascript service, this backend would have a race-condition if two `addPhoto()` calls occurred at the same time for the same `name` value. However, NodeVMS only executes one RPC call at a time -- all other calls are queued until the active call returns. This is called a "script-wide lock." The script-wide lock is very inefficient, but it improves the replayability of the backend.

### The content of the files dat-archive

The current state of the files dat-archive is available on the FS of the NodeVMS server. Its location is also emitted at the start (the "Serving directory") and it can be configured via cli opts:

```
nodevms -e ./counter.js ./my-counter-files
```

If you examine the files dat-archive, you will find:

 - a copy of the backend script at `./backend.js`,
 - metadata about the backend and its files archive at `./dat.json`, and
 - a `.dat` folder, which contains the internal datastructures of the files dat-archive and the call log.

**NOTE: You should never change the content of the files dat using the FS!!** Clients of your backend expect to be able to audit all changes made to the backend's state. They *will* detect an unlogged change and lose trust in your backend.

### Auditing the state of a backend

Each backend executed by NodeVMS publishes a call log using Dat. This call log can be replayed using NodeVMS to verify the state of the files dat-archive.

```bash
nodevms -a localhost:5555
```

Optionally, you can include the urls of the expected files archive and dat log:

```bash
nodevms -a localhost:5555 \
  --files dat://17f29b83be7002479d8865dad3765dfaa9aaeb283289ec65e30992dc20e3dabd \
  --log dat://7081814137ea43fc32348e2259027e94e85c7b395e6f3218e5f5cb803cc9bbef
```

Your NodeVMS client will download the call log and the current files archive, then replay the history to confirm the output state. If it does not match, NodeVMS will alert you to the disparity.

If you provide a storage directory, the verifier will continue running after the initial check and live-stream updates. The datasets will be persisted and rehosted on the dat network.

```bash
nodevms -a localhost:5555 \
  --out ./trusty-bobs-counters \
  --files dat://17f29b83be7002479d8865dad3765dfaa9aaeb283289ec65e30992dc20e3dabd \
  --log dat://7081814137ea43fc32348e2259027e94e85c7b395e6f3218e5f5cb803cc9bbef
```

### Users & authentication

The backend is provided information about the calling user, in order to make permissions decisions. The user's id is located on the `env` object, as `env.callerId`. Here's a simple example usage of permissions:

```js
// secure-counter.js
var ownerId
exports.init = () => {
  if (ownerId) throw new Error('I already have an owner!')
  ownerId = env.callerId
}
var counter = 0
exports.increment = () => {
  if (env.callerId !== ownerId) throw new Error('You are not my owner!')
  return counter++
}
```

This backend provides a counter which only the owner can increment. (The owner is established as the first user to connect and call `init()`.) The call log will note the caller ID for ever call, along with the caller's signature on the call data.

When debugmode is on, you can set the calledId to anything using the Basic Auth header when connecting to the server's websocket. For example:

```
nodevms -e ./secure-counter.js --debug

# in another term, the repl call:
nodevms -r localhost:5555 --user bob
```

**NOTE: The current version of NodeVMS does not have production authentication implemented.** Only the debugmode authentication is available.

### Calling out of the backend and accessing "Oracles"

The current version of NodeVMS does not let the backend-script access other processes, the network, or the FS (other than the files dat-archive). This is for two reasons:

 1. It's safer to run untrusted backends if they are sandboxed, and
 2. It encourages deterministic and auditable backends.

This means that, at this time, you cannot contact "Oracles."

**What is an Oracle?** An Oracle is a source of information that cannot be audited, usually because the source of its information is not auditably modeled in an backend. Put another way, it is a black box which a backend consults. Examples of Oracles include: sensors (eg a thermometer), random number generators, the wall clock, and a stock-price service. Any time an Oracle is used, it has to be trusted by the users, and it has to be modeled specially to deal with nondeterminism.

**About nondeterminism.** Backend scripts are designed to be deterministic. Their output state is a function of their call log: if you replay the call log against the backend script, you should get the same files archive. However, Oracles are nondeterministic- they introduce information which is not provided by the call log. There is currently no way to model Oracles or indeterminism in NodeVMS. If your backend's effects are not fully deterministic, then there is a good chance that verification will fail.

This is an example of a simple non-deterministic backend:

```js
const fs = System.files
module.exports = async function () {
  var value = Math.random() // ignore the fact that we could seed this random
  fs.writeFile('/latest', value)
  return value
}
```

Both the return value and the files state is not replayable in this backend, and so an audit would fail.

In the future, there will be a way to record non-determinism -- essentially by wrapping areas of code and storing the output in the call log. It will look something like this:

```js
module.exports = async function () {
  var value = await System.oracle(() => Math.random())
  await System.files.writeFile('/latest', value)
  return value
}
```

The `System.oracle()` wrapper will cache the return value so that replays of the log can use the same values, and not call the internal logic.

### JS client

You can programmatically connect to a NodeVMS backend using `nodevms-client`:

```js
var RRC = require('nodevms-client')
var rpc = await RRC.connect('localhost:5555')
console.log(await rpc.increment())
```

The rpc object will have all of the methods exported by the backend. Each method returns a promise, and can take any number of arguments.

The `connect()` function takes a set of opts:

```js
RPC.connect(backendURL, {
  user: 'bob',   // who should we connect as? (default null)
  timeout: 5e3,  // how many ms before the call times out? (default 5 seconds)
  audit: false   // should we audit the state of the backend? (default false)
})
```