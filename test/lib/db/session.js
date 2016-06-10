'use strict';
const Async = require('async');
const Code = require('code');
const DbScaffold = require('../../../lib/db/scaffold');
const Lab = require('lab');
const Proxyquire = require('proxyquire');
const Secret = require('../../../lib/secret');
const User = require('../../../lib/db/user');

const lab = exports.lab = Lab.script();
const stub = {
  Db: {}
};
const Session = Proxyquire('../../../lib/db/session', {
  './index': stub.Db
});

lab.before((done) => {
  Async.series([
    DbScaffold.setup.bind(DbScaffold),
    User.create.bind(User, 'pal', 'pal@friend'),
    function createSession (done) {
      Secret.hash('abcdefghijklmnopqrstuvwxyz', (err, secret) => {
        if (err) {
          return done(err);
        }

        Session.create('1', secret.hash, done);
      });
    }
  ], done);
});

lab.after((done) => {
  DbScaffold.clear(done);
});

lab.experiment('Session', () => {
  lab.test('it creates a record', (done) => {
    const userId = '1';
    const authKey = 'abcdefghijklmnopqrstuvwxyz';

    Session.create(userId, authKey, (err, record) => {
      Code.expect(err).to.not.exist();
      Code.expect(record).to.exist();

      done();
    });
  });
});

lab.experiment('Session authentication', () => {
  lab.test('it authenticates with a valid auth key', (done) => {
    const username = 'pal';
    const authKey = 'abcdefghijklmnopqrstuvwxyz';

    Session.authenticate(username, authKey, (err, success) => {
      Code.expect(err).to.not.exist();
      Code.expect(success).to.equal(true);

      done();
    });
  });

  lab.test('it does not authenticate with an invalid auth key', (done) => {
    const username = 'pal';
    const authKey = 'zyxwvutsrqponmlkjihgfedcba';

    Session.authenticate(username, authKey, (err, success) => {
      Code.expect(err).to.not.exist();
      Code.expect(success).to.equal(false);

      done();
    });
  });

  lab.test('it goes boom when db run fails', (done) => {
    const run = stub.Db.run;

    stub.Db.run = function (plain, hash, callback) {
      stub.Db.run = run;

      callback(Error('sorry pal'));
    };

    Session.authenticate(null, null, (err, success) => {
      Code.expect(err).to.exist();

      done();
    });
  });
});
