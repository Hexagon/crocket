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

/* eslint no-unused-vars: 0 */

"use strict";

var should = require("should"),
	ipc = require("../index.js"),
	address = {
		tcp: { host: "127.0.0.1", port: 31338 },
		socket: { path: "/tmp/crdtest.sock" }
	}

describe("Listening ...", function () {

	it("on tcp should not throw", function (done) {
		(function(){
			var server = new ipc();
			server.listen(address.tcp, (e) => { if(e) throw e; server.close(done); } );
		}).should.not.throw();
	});

	it("on sockets should not throw", function (done) {
		(function(){
			var server = new ipc();
			server.listen(address.socket, (e) => { if(e) throw e; server.close(done); } );
		}).should.not.throw();
	});

});

describe("Connecting ...", function () {

	it("to tcp should not throw", function (done) {
		(function(){

			// Create server
			var server = new ipc();
			server.listen(address.tcp, (e1) => { 
				if(e1) throw e1; 
				// Create client
				var client = new ipc();
				client.connect(address.tcp, (e2) => { 
					if(e2) throw e2; 
					client.close();
					server.close(done); 
				});
			});

		}).should.not.throw();
	});

	it("to socket should not throw", function (done) {
		(function(){

			// Create server
			var server = new ipc();
			server.listen(address.socket, (e1) => { 
				if(e1) throw e1; 
				// Create client
				var client = new ipc();
				client.connect(address.socket, (e2) => { 
					if(e2) throw e2; 
					client.close();
					server.close(done); 
				});
			});

		}).should.not.throw();
	});

});