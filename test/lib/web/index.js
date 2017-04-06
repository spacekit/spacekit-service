'use strict';
const Code = require('code');
const Http = require('http');
const Lab = require('lab');
const WebServer = require('../../../lib/web/index');

const lab = exports.lab = Lab.script();

lab.experiment('WebServer', () => {
  lab.test('it is a function', (done) => {
    Code.expect(WebServer).to.be.a.function();

    done();
  });

  lab.test('it creates a new hapi server', (done) => {
    const server = Http.createServer();
    const webServer = WebServer(server);

    Code.expect(webServer).to.be.an.object();

    done();
  });
});
