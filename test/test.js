/*

Copyright (c) 2016-2021 Hexagon <robinnilsson@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

/* eslint no-unused-vars: 0 */

let 
	suite = require("uvu").suite,
	assert = require("uvu/assert"),
	ipc = require("../index.js"),
	address = {
		tcp: { host: "127.0.0.1", port: 31338 },
		socket: { path: "/tmp/crdtest.sock" }
	};

// Convenience function for asynchronous testing
const timeout = (timeoutMs, fn) => {
	return () => { 
		let to = void 0;
		return new Promise((resolve, reject) => {
			fn(resolve, reject);
			to = setTimeout(() => { reject(new Error("Timeout")); }, timeoutMs);
		}).finally(() => {
			clearTimeout(to);
		});
	};
};

// Create a ~6MB payload
let longpayload = "I am payload";
for (let i = 0; i < 19;i++) {
	longpayload += longpayload;
}

const optionalNew = suite("new");

optionalNew("should be optional", timeout(2000, (resolve) => {
	assert.not.throws(() => {
		var server = ipc();
		server.listen(address.tcp, (e) => { if(e) throw e; server.close(resolve); } );
	});
}));

optionalNew.run();

const listen = suite("listen");

listen("on tcp should not throw", timeout(2000, (resolve) => {
	assert.not.throws(() => {
		var server = new ipc();
		server.listen(address.tcp, (e) => { if(e) throw e; server.close(resolve); } );
	});
}));

listen("on sockets should not throw", timeout(2000, (resolve) => {
	assert.not.throws(() => {
		var server = new ipc();
		server.listen(address.socket, (e) => { if(e) throw e; server.close(resolve); } );
	});
}));

listen.run();

const connect = suite("connect");

connect("to tcp should not throw", timeout(2000, (resolve, reject) => {
	assert.not.throws(() => {
		// Create server
		var server = new ipc();
		server.listen(address.tcp, (e1) => { 
			if(e1) throw e1; 
			// Create client
			var client = new ipc();
			client.connect(address.tcp, (e2) => { 
				if(e2) throw e2; 
				client.close();
				server.close(resolve); 
			});
		});
	});
}));

connect("to socket should not throw", timeout(2000, (resolve, reject) => {
	assert.not.throws(() => {

		// Create server
		var server = new ipc();
		server.listen(address.socket, (e1) => { 
			if(e1) throw e1; 
			// Create client
			var client = new ipc();
			client.connect(address.socket, (e2) => { 
				if(e2) throw e2; 
				client.close();
				server.close(resolve); 
			});
		});

	});
}));

connect.run();

const connectNonExisting = suite("connect to non existing server");


connectNonExisting("with tcp should return error", timeout(2000, (resolve, reject) => {

	assert.not.throws(() => {

		var client = new ipc();
		client.connect({ host: "asdf", port: 1234, timeout: 500}, (e) => { 
			if(e) {
				resolve(e);
			}
		});

	});
}));

connectNonExisting("with socket should return error", timeout(2000, (resolve, reject) => {

	assert.not.throws(() => {

		var client = new ipc();
		client.connect({ path: "/tmp/__lol-asdf-not-existing", timeout: 500}, (e) => { 
			if(e) {
				resolve();
			}
		});

	});
}));

connectNonExisting.run();

const reconnect = suite("reconnect");

reconnect("with tcp should not throw", timeout(7500, (resolve, reject) => {

	assert.not.throws(() => {

		var qbus = require("qbus");
		var client = new ipc(qbus);
		client.connect({ host: "127.0.0.1", port: 51234, timeout: 500, reconnect: 500}, (e) => { 
			if(!e) {
				client.emit("/test/this",{});
				client.close();
			}
		});

		// Start server after 5 seconds
		setTimeout(() => {

			var server = new ipc(qbus);
			server.listen({ host: "127.0.0.1", port: 51234 } , (e1) => { 
				if(e1) throw e1; 
			});
			server.on("/test/:what", (what, payload) => {
				server.close(resolve);
			});
			server.on("error", (e) => { throw e; }) ;
		
		},5000);
	});
}));

reconnect.run();

const altMediator = suite("alternative mediator");

altMediator("over tcp should complete and not throw", timeout(2000, (resolve, reject) => {
	assert.not.throws(() => {

		// Create server
		var qbus = require("qbus");
		var server = new ipc(qbus);
		server.listen(address.tcp, (e1) => { 
			if(e1) throw e1; 
			// Create client
			var client = new ipc(qbus);
			client.connect(address.tcp, (e2) => { 
				if(e2) throw e2; 
				client.emit("/test/send", "I am payload");
				client.close();
			});
			client.on("error", (e) => { throw e; }) ;
		});
		server.on("/test/:what", function (what, payload) {
			if (what === "send" && payload == "I am payload") {
				server.close(resolve);
			}
		});
		server.on("error", (e) => { throw e; }) ;

	});
}));

altMediator("over sockets should complete and not throw (2)", timeout(2000, (resolve, reject) => {
	assert.not.throws(() => {

		// Create server
		var qbus = require("qbus"),
			server = new ipc(qbus);
		server.listen(address.socket, (e1) => { 
			if(e1) throw e1; 
			// Create client
			var client = new ipc(qbus);
			client.connect(address.socket, (e2) => { 
				if(e2) throw e2; 
				client.emit("/test/send", "I am payload");
				client.close();
			});
			client.on("error", (e) => { throw e; }) ;
		});
		server.on("/test/:what", function (what, payload) {
			if (what === "send" && payload == "I am payload") {
				server.close(resolve);
			}
		});
		server.on("error", (e) => { throw e; }) ;

	});
}));

altMediator.run();

const longPayload = suite("long payload");

longPayload("over sockets should complete and not throw (3)", timeout(15000, (resolve, reject) => {
	assert.not.throws(() => {

		// Create server
		var server = new ipc();
		server.listen({ path: "/tmp/crdtest-3.sock" }, (e1) => { 
			if(e1) throw e1; 
			// Create client
			var client = new ipc();
			client.connect({ path: "/tmp/crdtest-3.sock" }, (e2) => { 
				if(e2) throw e2; 
				client.emit("/test/send", longpayload);
				client.on("/test/reply", function (payload) {
					assert.equal(payload,longpayload);
					client.close();
					server.close(resolve);
				});
			});
			client.on("error", (e) => { throw e; }) ;
		});
		server.on("/test/send", function (payload) {
			if ( payload == longpayload) {
				server.emit("/test/reply", longpayload);
			}
		});
		server.on("error", (e) => { throw e; }) ;

	});
}));

longPayload("over tcp should complete and not throw", timeout(15000, (resolve, reject) => {
	assert.not.throws(() => {

		// Create server
		var server = new ipc();
		server.listen(address.tcp, (e1) => { 
			if(e1) throw e1; 
			// Create client
			var client = new ipc();
			client.connect(address.tcp, (e2) => { 
				if(e2) throw e2; 
				client.emit("/test/send", longpayload);
				client.on("/test/reply", function (payload) {
					assert.equal(payload, longpayload);
					client.close();
					server.close(resolve);
				});
			});
			client.on("error", (e) => { throw e; }) ;
		});
		server.on("/test/send", function (payload) {
			if (payload == longpayload) {
				server.emit("/test/reply", longpayload);
			}
		});
		server.on("error", (e) => { throw e; }) ;

	});
}));

longPayload.run();

const emitCallback = suite("emit callback");
emitCallback("should execute over socket", timeout(2000, (resolve, reject) => {
	assert.not.throws(() => {

		// Create server
		var server = new ipc();
		server.listen({ path: "/tmp/crdtest-2.sock" }, (e1) => { 
			if(e1) throw e1; 
			// Create client
			var client = new ipc();
			client.connect({ path: "/tmp/crdtest-2.sock" }, (e2) => { 
				if(e2) throw e2; 
				client.emit("/test/send", longpayload, () => {
					client.close();
					server.close(resolve);
				});
			});
			client.on("error", (e) => { throw e; }) ;
		});
		server.on("/test/send", function (payload) {
			if ( payload == "I am payload") {
				server.emit("/test/reply");
			}
		});
		server.on("error", (e) => { throw e; }) ;
	});
}));

emitCallback("should execute over tcp", timeout(15000, (resolve, reject) => {
	assert.not.throws(() => {

		// Create server
		var server = new ipc();
		server.listen(address.tcp, (e1) => { 
			if(e1) throw e1; 
			// Create client
			var client = new ipc();
			client.connect(address.tcp, (e2) => { 
				if(e2) throw e2; 
				client.emit("/test/send", longpayload, () => {
					client.close();
					server.close(resolve);
				});
			});
			client.on("error", (e) => { throw e; }) ;
		});
		server.on("/test/send", function (payload) {
			if ( payload == "I am payload") {
				server.emit("/test/reply");
			}
		});
		server.on("error", (e) => { throw e; }) ;
	});
}));

emitCallback.run();