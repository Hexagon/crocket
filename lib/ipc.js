/*

Copyright (c) 2016 Hexagon <robinnilsson@gmail.com>

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

"use strict";

const 
	xpipe = require("xpipe"),
	bus = require("qbus")(),
	net = require("net"),

	defaults = require("./defaults.json"),

	extend = require("util")._extend;

function IPC () { 

	this._sockets = [];

	this._write = (topic, data, socket, callback) => {

		// Socket is only for server
		if (!this.isServer) {
			callback = socket;
			socket = this.socket;
		}

		try {
			socket.write(JSON.stringify({topic: topic, data: data}));
			callback && callback();
		} catch (e) {
			if (callback) {
				callback(e);
			} else {
				bus.emit("invalid", e);
			}
		}

	};

	this._broadcast = (topic, data, callback) => {
		try {
			let json = JSON.stringify({topic: topic, data: data});
			this.sockets.forEach(function(socket) {
				socket.write(json);
			});
			callback && callback();
		} catch (e) {
			if (callback) {
				callback(e);
			} else {
				bus.emit("error", e);
			}
		}
	};

	this._close = () => {

		if (this.isServer) {	
			this.opts.reconnect = -1;
			if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
			this.server.close(); 
		} else {
			this.socket.destroy();
		}
	};

	this._onData = (data, socket) => {
		try {
			var incoming = JSON.parse(data);
			if( incoming && incoming.topic ) {
				bus.emit(incoming.topic, incoming.data, socket);	
			} else {
				bus.emit("error", new Error("Invalid data received."));
			}
		} catch (e) {
			bus.emit("error", e);
		}
	};

	return this; 

}

IPC.prototype.listen = function (options, callback) {

	// ToDo, make options optional
	var self 	= this,
		server 	= net.createServer(function() {}),
		opts 	= extend(extend({}, defaults.server), options),
		connected = false;

	this.isServer = true;
	this.opts = opts;
	this.reconnectTimer = undefined;
	this.server = server;

	if (opts.port) {
		server.listen(opts.port, opts.host);	
	} else {
		server.listen(xpipe.eq(opts.path));	
	}
	
	// Trigger callback on fatal error, or listening (success)
	server.on("error", (e) => {
		if (!connected) {
			callback && callback(e);
		} else {
			bus.emit("error", e);
		}
	});

	server.on("listening", () => {
		connected = true;
		callback && callback();
	});

	// New connection established
	server.on("connection", function (socket) { 
		self._sockets.push(socket);
		socket.setEncoding(opts.encoding);
		socket.on("data", (data) => this.onData(data, socket) );
		socket.on("close", (socket) => { 
			bus.emit("close", socket);
			self._sockets.splice(self._sockets.indexOf(socket), 1);
		});
	});

	server.on("close", function () {
		bus.emit("close");
		if (opts.reconnect > 0) {
			this.reconnectTimer = setTimeout(function () {
				server.listen(options);
			}, opts.reconnect);
		}
	});

	return this; 
};

IPC.prototype.connect = function (options, callback) {


	// ToDo, make options optional
	var socket 	= new net.Socket(),
		opts 	= extend(extend({}, defaults.client), options),
		connected = false;

	this.isServer = false;
	this.opts = opts;
	this.socket = socket;

	socket.setEncoding(opts.encoding);

	if (opts.port) {
		socket.connect(opts.port, opts.host);	
	} else {
		socket.connect(xpipe.eq(opts.path));	
	}
	
	socket.on("connect", (data) => {
		connected = true;
		callback && callback();
		bus.emit("connect", data);
	});
	socket.on("error", (e) => {
		// If not connected, we can assume this is a connection error
		if ( !connected ) {
			callback && callback(e);
		}
		bus.emit("error", e);
	});

	socket.on("data", (data) => this._onData(data, socket) );
	
	socket.on("close", function () { 
		bus.emit("close");
		if(opts.reconnect > 0) {
			setTimeout(function () {
				socket.connect(opts.path);
			}, opts.reconnect);
		}
	});

	return this; 
};

IPC.prototype.on = function (event, callback) { bus.on(event, callback); return this; };

IPC.prototype.emit = function (topic, data, socket, callback) { this._write(topic, data, socket, callback); return this; };
IPC.prototype.broadcast = function (topic, data, callback) { this._broadcast(topic, data, callback); return this; };

IPC.prototype.close = function () { this._close(); return this; };

module.exports = IPC;