# NodeVMS alpha

A cryptographically auditable VM service using Nodejs and [Dat](https://github.com/datproject/dat). NodeVMS provides:

 - Easy deployment of backend scripts on a NodeVMS host.
 - RPC connectivity to backend scripts using Websockets.
 - Trustless execution of the backend through cryptographic auditing (you do not need to trust the NodeVMS host).

[Learn more at nodevms.com](https://nodevms.com).

See also:

 - [LibVMS](https://github.com/pfrazee/libvms)
 - [Example Scripts](./examples)
 - [What is the Dat protocol?](https://beakerbrowser.com/docs/inside-beaker/)

### TODOs

Still an alpha / prototype.

 - [x] CLI
 - [x] VM execution and environment
 - [x] RPC server, client repl
 - [x] Debugmode authentication
 - [x] Call log replay and verification
 - [ ] Production authentication & signed RPC calls
 - [ ] Secure VM
 - [ ] Oracles