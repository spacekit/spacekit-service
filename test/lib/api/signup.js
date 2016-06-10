'use strict';
const Async = require('async');
const Code = require('code');
const DbScaffold = require('../../../lib/db/scaffold');
const Hapi = require('hapi');
const Lab = require('lab');
const Proxyquire = require('proxyquire');

const lab = exports.lab = Lab.script();
const stub = {
  Secret: {},
  Session: {},
  User: {}
};
const Signup = Proxyquire('../../../lib/api/signup', {
  '../secret': stub.Secret,
  '../db/session': stub.Session,
  '../db/user': stub.User
});
const server = new Hapi.Server({ debug: false });

lab.before((done) => {
  server.connection();

  Async.series([
    DbScaffold.setup.bind(DbScaffold),
    server.register.bind(server, [Signup])
  ], done);
});

lab.after((done) => {
  DbScaffold.clear(done);
});

lab.experiment('Signup', () => {
  let requestRandom;
  let requestStatic;

  lab.beforeEach((done) => {
    requestStatic = {
      method: 'POST',
      url: '/signup',
      payload: {
        username: 'zerocool',
        email: 'zerocool@example.com'
      }
    };

    const rand = Math.floor(Math.random() * 10);

    requestRandom = {
      method: 'POST',
      url: '/signup',
      payload: {
        username: `zerocool${rand}`,
        email: `zerocool${rand}@example.com`
      }
    };

    done();
  });

  lab.test('it registers successfully', (done) => {
    server.inject(requestStatic, (response) => {
      Code.expect(response.statusCode).to.equal(200);

      done();
    });
  });

  lab.test('it goes boom when the username check fails', (done) => {
    const findOneByUsername = stub.User.findOneByUsername;

    stub.User.findOneByUsername = function () {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();

      stub.User.findOneByUsername = findOneByUsername;
      callback(Error('sorry pal'));
    };

    server.inject(requestRandom, (response) => {
      Code.expect(response.statusCode).to.equal(500);

      done();
    });
  });

  lab.test('it goes boom when the username check hits', (done) => {
    const findOneByUsername = stub.User.findOneByUsername;

    stub.User.findOneByUsername = function () {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();

      stub.User.findOneByUsername = findOneByUsername;
      callback(null, {});
    };

    server.inject(requestRandom, (response) => {
      Code.expect(response.statusCode).to.equal(409);

      done();
    });
  });

  lab.test('it goes boom when the email check fails', (done) => {
    const findOneByEmail = stub.User.findOneByEmail;

    stub.User.findOneByEmail = function () {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();

      stub.User.findOneByEmail = findOneByEmail;
      callback(Error('sorry pal'));
    };

    server.inject(requestRandom, (response) => {
      Code.expect(response.statusCode).to.equal(500);

      done();
    });
  });

  lab.test('it goes boom when the email check hits', (done) => {
    const findOneByEmail = stub.User.findOneByEmail;

    stub.User.findOneByEmail = function () {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();

      stub.User.findOneByEmail = findOneByEmail;
      callback(null, {});
    };

    server.inject(requestRandom, (response) => {
      Code.expect(response.statusCode).to.equal(409);

      done();
    });
  });

  lab.test('it goes boom when auth key generation fails', (done) => {
    const createUuid = stub.Secret.createUuid;

    stub.Secret.createUuid = function () {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();

      stub.Secret.createUuid = createUuid;
      callback(Error('sorry pal'));
    };

    server.inject(requestRandom, (response) => {
      Code.expect(response.statusCode).to.equal(500);

      done();
    });
  });
});
