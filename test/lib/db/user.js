'use strict';
const Code = require('code');
const DbScaffold = require('../../../lib/db/scaffold');
const Lab = require('lab');
const User = require('../../../lib/db/user');

const lab = exports.lab = Lab.script();
let userId;

lab.before((done) => {
  DbScaffold.setup(done);
});

lab.after((done) => {
  DbScaffold.clear(done);
});

lab.experiment('User', () => {
  lab.test('it creates a record', (done) => {
    const username = 'pal';
    const email = 'pal@friend';

    User.create(username, email, (err, record) => {
      Code.expect(err).to.not.exist();
      Code.expect(record).to.exist();

      userId = record.id;

      done();
    });
  });

  lab.test('it finds one by username', (done) => {
    const username = 'pal';

    User.findOneByUsername(username, (err, record) => {
      Code.expect(err).to.not.exist();
      Code.expect(record).to.exist();

      done();
    });
  });

  lab.test('it finds one by email', (done) => {
    const email = 'pal@friend';

    User.findOneByEmail(email, (err, record) => {
      Code.expect(err).to.not.exist();
      Code.expect(record).to.exist();

      done();
    });
  });

  lab.test('it finds one by credentials', (done) => {
    const username = 'pal';
    const email = 'pal@friend';

    User.findOneByCredentials(username, email, (err, record) => {
      Code.expect(err).to.not.exist();
      Code.expect(record).to.exist();

      done();
    });
  });

  lab.test('it sets the challenge', (done) => {
    const challenge = 'abcdefghijklmnopqrstuvwxyz';
    const expires = new Date();

    User.setChallenge(userId, challenge, expires, (err, record) => {
      Code.expect(err).to.not.exist();
      Code.expect(record).to.exist();

      done();
    });
  });
});
