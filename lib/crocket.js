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

/**
 * @typedef {Object} CrocketServerOptions - Crocket Options
 * @property {string} [path] - Path to socket, defaults to /tmp/crocket-ipc.sock
 * @property {string} [host] - Hostname/ip to connect to/listen to
 * @property {number} [port] - Port to connect/listen to, if port is specified, socket path is ignored and tcp is used instead
 * @property {string} [encoding] - Encoding for transmission, defaults to utf8
 */

/**
 * @typedef {Object} CrocketClientOptions - Crocket Options
 * @property {string} [path] - Path to socket, defaults to /tmp/crocket-ipc.sock
 * @property {string} [host] - Hostname/ip to connect to/listen to
 * @property {number} [port] - Port to connect/listen to, if port is specified, socket path is ignored and tcp is used instead
 * @property {number} [timeout] - In ms, defaults to 2000 for server and 5000 for client
 * @property {number} [reconnect] - How many ms between reconnection attempts, defaults to -1 (disabled)
 * @property {string} [encoding] - Encoding for transmission, defaults to utf8
 */

"use strict";

const 
	xpipe = require("xpipe"),
	net = require("net"),
	EventEmitter = require("events"),
	extend = require("util")._extend;

// Private properties
const
	defaults = {
		"server": {
			"path": "/tmp/crocket-ipc.sock",
			"host": null,
			"port": null,
			"timeout": 2000,
			"encoding": "utf8"
		},
		"client": {
			"path": "/tmp/crocket-ipc.sock",
			"host": null,
			"port": null,
			"reconnect": -1,
			"timeout": 5000,
			"encoding": "utf8"
		}
	},
	separator = "<<<EOM\0";

/**
 * Crocket constructor
 * 
 * @constructor
 * @param {*} [mediator] - Mediator to use, EventEmitter is default
 * @returns {Crocket}
 */
function Crocket (mediator) {

	// Optional "new" keyword
	if( !(this instanceof Crocket) ) {
		return new Crocket();
	}

	// Connect mediator
	if ( mediator ) {
		/** @type {*} */
		this.mediator = new mediator();
	} else {
		/** @type {*} */
		this.mediator = new EventEmitter();
		// Register bogus error listener, but why?
		this.mediator.on( "error" , () => {} );
	}
	
	this.sockets = [];
	this.connectTimeout = void 0;
	this.buffer = void 0;

	/** @type {CrocketClientOptions|CrocketServerOptions} */
	this.opts = {};

	return this; 
}

/**
 * @private
 * @param {*} message 
 * @param {*} socket 
 */
Crocket.prototype._onMessage = function (message, socket) {
	try {
		var incoming = JSON.parse(message);
		if( incoming && incoming.topic ) {
			this.mediator.emit(incoming.topic, incoming.data, socket);	
		} else {
			this.mediator.emit("error", new Error("Invalid data received."));
		}
	} catch (e) {
		this.mediator.emit("error", e);
	}
};

/**
 * @private
 * @param {*} data
 * @param {*} socket
 */
Crocket.prototype._onData = function (data, socket) {

	// Append to buffer
	if ( this.buffer ) {
		this.buffer += data;	
	} else {
		this.buffer = data;
	}
	
	// Did we get a separator
	if (data.indexOf(separator) !== -1) {
		while(this.buffer.indexOf(separator) !== -1) {
			var message = this.buffer.substring(0,this.buffer.indexOf(separator));
			this.buffer = this.buffer.substring(this.buffer.indexOf(separator)+separator.length);
			if (message) {
				this._onMessage(message, socket);	
			}
		}
	}

};


/**
 * Register a callback for a mediator event
 * 
 * @public
 * @param {string} event 
 * @param {Function} callback 
 * @returns {Crocket}
 */
Crocket.prototype.on = function (event, callback) { 
	this.mediator.on(event, callback); 
	return this; 
};

/**
 * Emit a mediator message
 * 
 * @public
 * @param {string} topic 
 * @param {*} data 
 * @param {Function} [callback] 
 * @returns {Crocket}
 */
Crocket.prototype.emit = function (topic, data, callback) { 
	try {
		var message = JSON.stringify({topic: topic, data: data})+separator;
		this.sockets.forEach(function(socket) {
			socket.write(message);
		});
		callback && callback();
	} catch (e) {
		if (callback) {
			callback(e);
		} else {
			this.mediator.emit("error", e);
		}
	}
	return this; 
};

/**
 * Close IPC connection, used for both server and client
 * 
 * @public
 * @param {Function} [callback] 
 * @returns {Crocket}
 */
Crocket.prototype.close = function (callback) { 
	if (this.isServer) {	
		this.server.close(); 
		if (callback) this.server.on("close", callback); 
	} else {
		this.opts.reconnect = -1;
		clearTimeout(this.connectTimeout);
		this.sockets[0].destroy(callback);
	}
	return this; 
};

/**
 * Start listening
 * 
 * @public
 * @param {CrocketServerOptions} options 
 * @param {Function} callback 
 * @returns {Crocket}
 */
Crocket.prototype.listen = function (options, callback) {

	let self = this;

	// ToDo, make options optional
	this.opts = extend(extend(this.opts, defaults.server), options);
	this.isServer = true;

	this.server = net.createServer();

	this.server.on("error", (e) => self.mediator.emit("error", e) );

	// New connection established
	this.server.on("connection", (socket) => {
		self.sockets.push(socket);
		self.mediator.emit("connect", socket);
		socket.setEncoding(self.opts.encoding);
		socket.on("data", (data) => self._onData(data, socket) );
		socket.on("close", (socket) => { 
			self.mediator.emit("disconnect", socket);
			self.sockets.splice(self.sockets.indexOf(socket), 1);
		});
	});

	this.server.on("close", () => {
		self.mediator.emit("close");
	});

	// Start listening
	if (this.opts.port) {
		this.server.listen(this.opts.port, this.opts.host, callback);
	} else {
		this.server.listen(xpipe.eq(this.opts.path), callback);
	}

	return this; 
};

/**
 * Connect to a Crocket server
 * 
 * @public
 * @param {CrocketClientOptions} options 
 * @param {Function} callback 
 * @returns {Crocket}
 */
Crocket.prototype.connect = function (options, callback) {

	var self = this;

	// ToDo, make options optional
	
	this.opts = extend(extend(this.opts, defaults.client), options);	
	this.isServer = false;

	var socket 	= new net.Socket();
	this.sockets = [socket];

	var

		flagConnected,

		connected = () => {
			flagConnected = true;
			clearTimeout(self.connectTimeout);
			callback && callback();
		},

		connect = (first) => {
			if (self.opts.port) {
				socket.connect(self.opts.port, self.opts.host, first ? connected : undefined);	
			} else { 
				socket.connect(xpipe.eq(self.opts.path), first ? connected : undefined);
			}		
			self.connectTimeout = setTimeout(() => {
				if ( !flagConnected ) {
					socket.destroy();
					if (self.opts.reconnect === -1) {
						callback(new Error("Connection timeout"));
					}
				}
			}, self.opts.timeout);
		};

	socket.setEncoding(self.opts.encoding);

	socket.on("error", (e) => {
		self.mediator.emit("error", e);
	});

	socket.on("data", (data) => {
		self._onData(data, socket);
	});

	socket.on("close", () => {
		if (self.opts.reconnect > 0) {
			setTimeout(() => connect(), self.opts.reconnect);
		} else {
			self.mediator.emit("close");
		}
	});

	connect(true);

	return this; 
};

module.exports = Crocket;