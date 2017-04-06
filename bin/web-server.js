#!/usr/bin/env node
'use strict';
const WebServer = require('../lib/web');
const Http = require('http');

const server = Http.createServer();
const port = process.env.PORT || 3000;

WebServer(server);

server.listen(port, () => {
  console.log(`listening on port ${port}`);
});
