# qbus-ipc

[![Build status](https://travis-ci.org/Hexagon/qbus-ipc.svg)](https://travis-ci.org/Hexagon/qbus-ipc) [![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://img.shields.io/badge/license-MIT-blue.svg)

Minimal cross platform IPC communication library, highlights:

	* Communcates over TCP, unix sockets or windows pipe.
	* [qbus](https://www.npmjs.com/package/qbus) as event mediator
	* Works locally OR remotely.
	* Works on Linux, Windows AND macOS


# Installation

```npm install qbus-ipc```

# Usage

### Host process

**Server process**
```
var ipc = require("qbus-ipc"),
	server = new ipc();

// Start listening, this example communicate by file sockets
server.listen({ "path": "/tmp/qbus-ipc-test.sock" }, (e) => { 

	// Fatal errors are supplied as the first parameter to callback
	if(e) throw e; 

	// All is well if we got this far
	console.log('IPC listening on /tmp/qbus-ipc-test.sock');

});

// Events are handled by qbus
//   Documentation:	https://github.com/unkelpehr/qbus
//   Query tester: 	http://unkelpehr.github.io/qbus/
server.on('/request/:what', function (what, payload) {
	
	// Respond to the query
	server.emit('/response', 'You asked for ' + what + ' and supplied ' + payload);

});

// React to communication errors
server.on('error', (e) => { console.error('Communication error occurred: ', e); });
```

## Client process

```javascript
var client = new ipc();
client.connect({ "path": "/tmp/qbus-ipc-test.sock" }, (e) => { 

	// Connection errors are supplied as the first parameter to callback
	if(e) throw e; 

	// Instantly a message to the server
	client.emit('/test/food', 'cash');

});

// Expect a reply on '/response'
client.on('/response', function (what) {

	// Should print 'Server said: You asked for food and supplied cash'
	console.log('Server said: ' + what);

	// Work is done now, no need to keep a connection open
	client.close();

});

```

## Options

Configuration defaults, and all configurable options are as fallow.

**Server**
```json
{
	"path": "/tmp/node-ipc.sock",
	"host": null,
	"port": null,
	"reconnect": 2000,
	"encoding": "utf8"
}
```

**Client**
```json
{
	"path": "/tmp/node-ipc.sock",
	"host": null,
	"port": null,
	"reconnect": -1,
	"encoding": "utf8"
}
```

**Path** is a windows/unix socket path, normalized by [xpipe](https://www.npmjs.com/package/xpipe). As an example, "/tmp/my.sock" is unchanged on Linux/OS X, while it is transformed to "//./pipe/tmp/my.sock" on Windows.

**Port** is specified if you want to use TCP instead of file sockets.

**Host** Only used in TCP mode. For server, '0.0.0.0' makes qbus-ipc listen on any IPv4-interface. '::' Is the equivalent for IPv6. For client, you specify the host address.

**Reconnect** is the number of milliseconds to wait before reviving a broken listener/connection, or -1 to disable automtic revive.

**Encoding** the encoding used by the underlaying sockets, in most cases this should be left at default.


# License

MIT
