/* Multi-WS Monster */
/* Spawn multiple WebSockets from the same HTTP/HTTPS server
 * Each socket is scoped to its ws.path and intended for ephemeral usage
 * MIT Licensed (C) QXIP 2020
 */

let debug = process.env.DEBUG || true;

// LRU with last used sockets
const QuickLRU = require("quick-lru");
const lru = new QuickLRU({ maxSize: 1000, onEviction: false });
if (debug) console.log("LRU initialized");

const fs = require("fs");
const html = fs.readFileSync("index.html", "utf8");

const uWS = require('uWebSockets.js');
const port = process.env.PORT || 443;
const host = process.env.HOST || '127.0.0.1';

const app = uWS.SSLApp({
  key_file_name: process.env.SSLKEY,
  cert_file_name: process.env.SSLCERT
}).ws('/*', {
  /* Options */
  compression: 0,
  maxPayloadLength: 16 * 1024 * 1024,
  idleTimeout: 3600,

  /* Handlers */
  upgrade: (res, req, context) => { // a request was made to open websocket, res req have all the properties for the request, cookies etc
      // add code here to determine if ws request should be accepted or denied
      // can deny request with "return res.writeStatus('401').end()" see issue #367
      res.upgrade( // upgrade to websocket
         { ip: res.getRemoteAddress(), path: req.getUrl().replace(/^\/|\/$/g, '')||'broadcast' }, // 1st argument sets which properties to pass to the ws object, in this case ip address
         req.getHeader('sec-websocket-key'),
         req.getHeader('sec-websocket-protocol'),
         req.getHeader('sec-websocket-extensions'), // these 3 headers are used to setup the websocket
         context // also used to setup the websocket
      )
  },
  open: (ws) => {
    /* Let this client listen to topic "broadcast" */
    if (debug) console.log('open',ws);
    ws.subscribe(ws.path);
  },
  message: (ws, message, isBinary) => {
    if (debug) console.log('message',ws,message);
    /* Broadcast this message */
    ws.publish(ws.path, message, isBinary);
  },
  drain: (ws) => {

  },
  close: (ws, code, message) => {
    /* The library guarantees proper unsubscription at close */
    if (debug) console.log('closed',code,message);
  }
}).post('/:cmd/:path/:key', (res, req) => {
  /* Note that you cannot read from req after returning from here */
  let url  = req.getUrl().replace(/^\/|\/$/g, '');
  var cmd  = req.getParameter(0);
  var path = req.getParameter(1);
  var key  = req.getParameter(2);
  console.log('post',path,key);
  if(cmd=="set"){
	  /* Read the body until done or error */
	  readJson(res, (obj) => {
	    if (debug) console.log('POST query for ' + url + ': ', obj);
	    try { lru.set(path, obj); } catch(e){ console.log(e); }
	    res.writeStatus('200 OK').end('Stored');
	  }, () => {
	    if (debug) console.log('Invalid JSON or no data at all!');
	    res.writeStatus('500').end();
	  });
  } else if (cmd =="get"){
	    try { res.end(JSON.stringify(lru.get(path))); } catch(e){ console.log(e); }
  } else {  res.end('invalid command'); }

}).any('/*', (res, req) => {
  res.end(html);
  // res.end('Nothing to see here!');
}).listen(host, port, (token) => {
  if (token) {
    console.log('Listening to port ' + port);
  } else {
    console.log('Failed to listen to port ' + port);
  }
});


/* Helper function for reading a posted JSON body */
function readJson(res, cb, err) {
  let buffer;
  /* Register data cb */
  res.onData((ab, isLast) => {
    let chunk = Buffer.from(ab);
    if (isLast) {
      let json;
      if (buffer) {
        try {
          json = JSON.parse(Buffer.concat([buffer, chunk]));
        } catch (e) {
          /* res.close calls onAborted */
          res.close();
          return;
        }
        cb(json);
      } else {
        try {
          json = JSON.parse(chunk);
        } catch (e) {
          /* res.close calls onAborted */
          res.close();
          return;
        }
        cb(json);
      }
    } else {
      if (buffer) {
        buffer = Buffer.concat([buffer, chunk]);
      } else {
        buffer = Buffer.concat([chunk]);
      }
    }
  });

  /* Register error cb */
  res.onAborted(err);
}
