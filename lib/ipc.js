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
	net = require("net"),
	qbus = require("qbus"),
	defaults = require("./defaults.json"),

	extend = require("util")._extend;

var
	// "Private" methods
	write, broadcast, close, onData;

function IPC () {

	// Private properties
	var bus = new qbus(),
		sockets = [];

	// Private methods
	var write = (topic, data, socket, callback) => {

			var _sockets = socket ? [socket] : sockets;

			try {
				_sockets.forEach(function(socket) {
					socket.write(JSON.stringify({topic: topic, data: data}));
				});
				callback && callback();
			} catch (e) {
				if (callback) {
					callback(e);
				} else {
					bus.emit("error", e);
				}
			}

		},

		close = (callback) => {
			if (this.isServer) {	
				this.opts.reconnect = -1;
				if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
				if (callback) this.server.on("close", callback);	
				this.server.close(); 
			} else {
				sockets[0].destroy(callback);
			}
		},

		onData = (data, socket) => {
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
		},

		connect = (obj, fn, callback) => {
			if (this.opts.port) obj[fn](this.opts.port, this.opts.host, callback);	
			else obj[fn](xpipe.eq(this.opts.path), callback);
		};

	// Public methods
	this.on = function (event, callback) { bus.on(event, callback); return this; };
	this.emit = function (topic, data, socket, callback) { write(topic, data, socket, callback); return this; };
	this.close = function (callback) { close(callback); return this; };
	this.listen = function (options, callback) {

		// ToDo, make options optional
		var server 	= net.createServer(),
			opts 	= extend(extend({}, defaults.server), options);

		this.isServer = true;
		this.opts = opts;
		this.server = server;
		
		server.on("error", (e) => bus.emit("error", e) );

		// New connection established
		server.on("connection", function (socket) {
			sockets.push(socket);
			bus.emit("connect", socket);
			socket.setEncoding(opts.encoding);
			socket.on("data", (data) => onData(data, socket) );
			socket.on("close", (socket) => { 
				bus.emit("disconnect", socket);
				sockets.splice(sockets.indexOf(socket), 1);
			});
		});

		server.on("close", function () {
			if (opts.reconnect > 0) setTimeout(() => connect(server.listen), opts.reconnect);
			else bus.emit("close");
		});

		connect(server, 'listen', callback);

		return this; 
	};

	this.connect = function (options, callback) {

		// ToDo, make options optional
		var socket 	= new net.Socket(),
			opts 	= extend(extend({}, defaults.client), options);

		this.isServer = false;
		this.opts = opts;
		sockets = [socket];

		socket.setEncoding(opts.encoding);

		socket.on("error", (e) => bus.emit("error", e) );

		socket.on("data", (data) => onData(data, socket) );

		socket.on("close", () => {
			if (opts.reconnect > 0) setTimeout(() => connect(socket.connect), opts.reconnect);
			else bus.emit("close");
		});

		connect(socket, 'connect', callback);

		return this; 
	};

	return this; 
}


module.exports = IPC;