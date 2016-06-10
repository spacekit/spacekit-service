'use strict';
const ApiServer = require('../../../lib/api/index');
const Code = require('code');
const Http = require('http');
const Lab = require('lab');

const lab = exports.lab = Lab.script();

lab.experiment('ApiServer', () => {
  lab.test('it is a function', (done) => {
    Code.expect(ApiServer).to.be.a.function();

    done();
  });

  lab.test('it creates a new hapi server', (done) => {
    const server = Http.createServer();
    const apiServer = ApiServer(server);

    Code.expect(apiServer).to.be.an.object();

    done();
  });
});
