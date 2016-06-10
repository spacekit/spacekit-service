'use strict';
const Code = require('code');
const Hapi = require('hapi');
const Hello = require('../../../lib/api/hello');
const Lab = require('lab');

const lab = exports.lab = Lab.script();
const server = new Hapi.Server({ debug: false });

lab.before((done) => {
  server.connection();
  server.register([Hello], done);
});

lab.test('it says hello', (done) => {
  const request = {
    method: 'GET',
    url: '/'
  };

  server.inject(request, (response) => {
    Code.expect(response.statusCode).to.equal(200);

    done();
  });
});
