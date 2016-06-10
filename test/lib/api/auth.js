'use strict';
const Async = require('async');
const Code = require('code');
const DbScaffold = require('../../../lib/db/scaffold');
const Hapi = require('hapi');
const Lab = require('lab');
const Proxyquire = require('proxyquire');
const User = require('../../../lib/db/user');

const lab = exports.lab = Lab.script();
const stub = {
  Mailer: {},
  Secret: {},
  User: {}
};
const Auth = Proxyquire('../../../lib/api/auth', {
  '../mailer': stub.Mailer,
  '../secret': stub.Secret,
  '../db/user': stub.User
});
const server = new Hapi.Server({ debug: false });

lab.before((done) => {
  server.connection();

  Async.series([
    DbScaffold.setup.bind(DbScaffold),
    User.create.bind(User, 'zerocool', 'zerocool@example.com'),
    server.register.bind(server, [Auth])
  ], done);
});

lab.after((done) => {
  DbScaffold.clear(done);
});

lab.experiment('Auth challenge', () => {
  let requestRandom;
  let requestStatic;

  lab.beforeEach((done) => {
    requestStatic = {
      method: 'POST',
      url: '/auth/challenge',
      payload: {
        username: 'zerocool',
        email: 'zerocool@example.com'
      }
    };

    const rand = Math.floor(Math.random() * 10);

    requestRandom = {
      method: 'POST',
      url: '/auth/challenge',
      payload: {
        username: `zerocool${rand}`,
        email: `zerocool${rand}@example.com`
      }
    };

    done();
  });

  lab.test('it successfully creates a challenge', (done) => {
    const createPin = stub.Secret.createPin;

    stub.Secret.createPin = function (callback) {
      stub.Secret.createPin = createPin;
      stub.Secret.hash(123456, callback);
    };

    const sendEmail = stub.Mailer.sendEmail;

    stub.Mailer.sendEmail = function () {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();

      stub.Mailer.sendEmail = sendEmail;
      callback();
    };

    server.inject(requestStatic, (response) => {
      Code.expect(response.statusCode).to.equal(200);

      done();
    });
  });

  lab.test('it goes boom when user lookup fails', (done) => {
    const findOneByCredentials = stub.User.findOneByCredentials;

    stub.User.findOneByCredentials = function () {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();

      stub.User.findOneByCredentials = findOneByCredentials;
      callback(Error('sorry pal'));
    };

    server.inject(requestStatic, (response) => {
      Code.expect(response.statusCode).to.equal(500);

      done();
    });
  });

  lab.test('it goes boom when user lookup misses', (done) => {
    server.inject(requestRandom, (response) => {
      Code.expect(response.statusCode).to.equal(409);

      done();
    });
  });

  lab.test('it goes boom when pin creation fails', (done) => {
    const createPin = stub.Secret.createPin;

    stub.Secret.createPin = function () {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();

      stub.Secret.createPin = createPin;
      callback(Error('sorry pal'));
    };

    server.inject(requestStatic, (response) => {
      Code.expect(response.statusCode).to.equal(500);

      done();
    });
  });
});

lab.experiment('Auth answer', () => {
  let requestRandom;
  let requestStatic;

  lab.beforeEach((done) => {
    requestStatic = {
      method: 'POST',
      url: '/auth/answer',
      payload: {
        username: 'zerocool',
        email: 'zerocool@example.com',
        pin: '123456'
      }
    };

    const rand = Math.floor(Math.random() * 10);

    requestRandom = {
      method: 'POST',
      url: '/auth/answer',
      payload: {
        username: `zerocool${rand}`,
        email: `zerocool${rand}@example.com`,
        pin: '123456'
      }
    };

    done();
  });

  lab.test('it successfully answers a challenge', (done) => {
    server.inject(requestStatic, (response) => {
      Code.expect(response.statusCode).to.equal(200);

      done();
    });
  });

  lab.test('it goes boom when user lookup fails', (done) => {
    const findOneByCredentials = stub.User.findOneByCredentials;

    stub.User.findOneByCredentials = function () {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();

      stub.User.findOneByCredentials = findOneByCredentials;
      callback(Error('sorry pal'));
    };

    server.inject(requestStatic, (response) => {
      Code.expect(response.statusCode).to.equal(500);

      done();
    });
  });

  lab.test('it goes boom when user lookup misses', (done) => {
    server.inject(requestRandom, (response) => {
      Code.expect(response.statusCode).to.equal(409);

      done();
    });
  });

  lab.test('it goes boom when the challenge is not set', (done) => {
    server.inject(requestStatic, (response) => {
      Code.expect(response.statusCode).to.equal(409);

      done();
    });
  });

  lab.test('it goes boom when the challenge has expired', (done) => {
    const findOneByCredentials = stub.User.findOneByCredentials;

    stub.User.findOneByCredentials = function (username, email, callback) {
      stub.User.findOneByCredentials = findOneByCredentials;

      stub.User.findOneByCredentials(username, email, (_, user) => {
        user.challenge = 'abcdefghijklmnopqrstuvwxyz';
        user.challenge_expires = '1999-01-01T00:00:00.000Z';

        callback(null, user);
      });
    };

    server.inject(requestStatic, (response) => {
      Code.expect(response.statusCode).to.equal(409);

      done();
    });
  });

  lab.test('it goes boom when pin compare fails', (done) => {
    const findOneByCredentials = stub.User.findOneByCredentials;

    stub.User.findOneByCredentials = function (username, email, callback) {
      stub.User.findOneByCredentials = findOneByCredentials;

      stub.User.findOneByCredentials(username, email, (_, user) => {
        user.challenge = 'abcdefghijklmnopqrstuvwxyz';
        user.challenge_expires = '2099-01-01T00:00:00.000Z';

        callback(null, user);
      });
    };

    const compare = stub.Secret.compare;

    stub.Secret.compare = function () {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();

      stub.Secret.compare = compare;
      callback(Error('sorry pal'));
    };

    server.inject(requestStatic, (response) => {
      Code.expect(response.statusCode).to.equal(500);

      done();
    });
  });

  lab.test('it goes boom when pin compare misses', (done) => {
    const findOneByCredentials = stub.User.findOneByCredentials;

    stub.User.findOneByCredentials = function (username, email, callback) {
      stub.User.findOneByCredentials = findOneByCredentials;

      stub.User.findOneByCredentials(username, email, (_, user) => {
        user.challenge = 'abcdefghijklmnopqrstuvwxyz';
        user.challenge_expires = '2099-01-01T00:00:00.000Z';

        callback(null, user);
      });
    };

    const compare = stub.Secret.compare;

    stub.Secret.compare = function () {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();

      stub.Secret.compare = compare;
      callback(null, false);
    };

    server.inject(requestStatic, (response) => {
      Code.expect(response.statusCode).to.equal(409);

      done();
    });
  });

  lab.test('it goes boom when a handler routine fails', (done) => {
    const findOneByCredentials = stub.User.findOneByCredentials;

    stub.User.findOneByCredentials = function (username, email, callback) {
      stub.User.findOneByCredentials = findOneByCredentials;

      stub.User.findOneByCredentials(username, email, (_, user) => {
        user.challenge = 'abcdefghijklmnopqrstuvwxyz';
        user.challenge_expires = '2099-01-01T00:00:00.000Z';

        callback(null, user);
      });
    };

    const compare = stub.Secret.compare;

    stub.Secret.compare = function () {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();

      stub.Secret.compare = compare;
      callback(null, true);
    };

    const setChallenge = stub.User.setChallenge;

    stub.User.setChallenge = function () {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();

      stub.User.setChallenge = setChallenge;
      callback(Error('sorry pal'));
    };

    server.inject(requestStatic, (response) => {
      Code.expect(response.statusCode).to.equal(500);

      done();
    });
  });
});
