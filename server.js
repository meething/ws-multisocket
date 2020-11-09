/* Multi-WS Monster */
/* Spawn multiple WebSockets from the same HTTP/HTTPS server
 * Each socket is scoped to its ws.path and intended for ephemeral usage
 * MIT Licensed (C) QXIP 2020
 */

const fs = require("fs");
const url = require("url");
const http = require("http");
const https = require("https");
const WebSocket = require("ws");
let debug = process.env.DEBUG || false;
let config = {};
config.options = {}
if (!process.env.hasOwnProperty('SSL')||process.env.SSL == false) {
  var server = http.createServer();
  server.listen(process.env.PORT || 3000);
} else {
  config.options.key= process.env.SSLKEY ? fs.readFileSync(process.env.SSLKEY) : false,
  config.options.cert= process.env.SSLCERT ? fs.readFileSync(process.env.SSLCERT) :  false
  var server = https.createServer(config.options);
  server.listen(process.env.PORT || 443);
}

// LRU with last used sockets
const QuickLRU = require("quick-lru");
const lru = new QuickLRU({ maxSize: 1000, onEviction: false });

server.on("upgrade", async function(request, socket, head) {
  let parsed = url.parse(request.url,true);
  if(debug) console.log("parsed",parsed);
  let pathname = parsed.pathname || "/gun";
  pathname = pathname.replace(/^\/\//g,'/');
  if (debug) console.log("Got WS request", pathname);

  var gun = { gun: false, server: false };
  if (pathname) {
    if (lru.has(pathname)) {
      // Existing Node
      if (debug) console.log("Recycle id", pathname);
      gun = await lru.get(pathname);
    } else {
      // Create Node
      if (debug) console.log("Create id", pathname);
      // NOTE: Only works with lib/ws.js shim allowing a predefined WS as ws.web parameter in Gun constructor
      gun.server = new WebSocket.Server({ noServer: true, path: pathname });
      lru.set(pathname, gun);
    }
  }
  if (gun.server) {
    // Handle Request
    gun.server.handleUpgrade(request, socket, head, function(ws) {
      if (debug) console.log("connecting to gun instance", gun.gun.opt()._.opt.ws.path);
      gun.server.emit("connection", ws, request);
    });
  } else {
    if (debug) console.log("destroying socket", pathname);
    socket.destroy();
  }
});
