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
	defaults = require("./defaults.json"),

	EventEmitter = require('events'),

	extend = require("util")._extend;

function IPC () {

	// Private properties
	var mediator,
		sockets = [],
		connectTimeout;

	// Private methods
	var write = (topic, data, socket, callback) => {

			// Socket is optional
			if ( typeof socket === "function") {
				callback = socket;
				socket = undefined;
			}

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
					mediator.emit("error", e);
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
				clearTimeout(connectTimeout);
				sockets[0].destroy(callback);
			}
		},

		onData = (data, socket) => {
			try {
				var incoming = JSON.parse(data);
				if( incoming && incoming.topic ) {
					mediator.emit(incoming.topic, incoming.data, socket);	
				} else {
					mediator.emit("error", new Error("Invalid data received."));
				}
			} catch (e) {
				mediator.emit("error", e);
			}
		},

		initializeMediator = () => {
			if ( !mediator ) mediator = new EventEmitter();
			// Register bugus error listener
			mediator.on( "error" , (e) => {} );
		};

	// Public methods
	this.use = (o) => { mediator = new o() };
	this.on = function (event, callback) { mediator.on(event, callback); return this; };
	this.emit = function (topic, data, socket, callback) { write(topic, data, socket, callback); return this; };
	this.close = function (callback) { close(callback); return this; };
	this.listen = function (options, callback) {

		// ToDo, make options optional
		var server 	= net.createServer(),
			opts 	= extend(extend({}, defaults.server), options),

			connect = () => {
				if (opts.port) server.listen(opts.port, opts.host, callback);	
				else server.listen(xpipe.eq(opts.path), callback);
			};

		this.isServer = true;
		this.opts = opts;
		this.server = server;

		initializeMediator();

		server.on("error", (e) => mediator.emit("error", e) );

		// New connection established
		server.on("connection", function (socket) {
			sockets.push(socket);
			mediator.emit("connect", socket);
			socket.setEncoding(opts.encoding);
			socket.on("data", (data) => onData(data, socket) );
			socket.on("close", (socket) => { 
				mediator.emit("disconnect", socket);
				sockets.splice(sockets.indexOf(socket), 1);
			});
		});

		server.on("close", function () {
			if (opts.reconnect > 0) setTimeout(() => connect(server.listen), opts.reconnect);
			else mediator.emit("close");
		});

		// Start listening
		connect();

		return this; 
	};

	this.connect = function (options, callback) {

		// ToDo, make options optional
		var socket 	= new net.Socket(),
			opts 	= extend(extend({}, defaults.client), options),

			flagConnected,

			connected = () => {
				flagConnected = true;
				callback && callback();
			},

			connect = (first) => {
				flagConnected = false;
				if (opts.port) socket.connect(opts.port, opts.host, first ? connected : undefined);	
				else socket.connect(xpipe.eq(opts.path), first ? connected : undefined);
				connectTimeout = setTimeout(() => {
					if ( !flagConnected ) {
						socket.destroy();
						if (opts.reconnect === -1) {
							callback(new Error('Connection timeout'));
						}
					}
				}, opts.timeout);
			};

		this.isServer = false;
		this.opts = opts;
		sockets = [socket];

		initializeMediator();

		socket.setEncoding(opts.encoding);

		socket.on("error", (e) => {
			mediator.emit("error", e) 
		});

		socket.on("data", (data) => onData(data, socket) );

		socket.on("close", () => {
			if (opts.reconnect > 0) setTimeout(() => connect(), opts.reconnect);
			else mediator.emit("close");
		});

		connect(true);

		return this; 
	};

	return this; 
}


module.exports = IPC;