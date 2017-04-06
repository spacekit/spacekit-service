#!/usr/bin/env node
'use strict';
const ApiServer = require('../lib/api');
const Http = require('http');

const server = Http.createServer();
const port = process.env.PORT || 3000;

ApiServer(server);

server.listen(port, () => {
  console.log(`listening on port ${port}`);
});
