'use strict';
const Code = require('code');
const Lab = require('lab');
const Proxyquire = require('proxyquire');

const lab = exports.lab = Lab.script();
const stub = {
  Bcrypt: {}
};
const Secret = Proxyquire('../../lib/secret', {
  'bcrypt': stub.Bcrypt
});

lab.experiment('Secret', () => {
  lab.test('it creates a uuid pair', (done) => {
    Secret.createUuid((err, data) => {
      Code.expect(err).to.not.exist();
      Code.expect(data.plain).to.exist();

      done();
    });
  });

  lab.test('it creates a pin pair', (done) => {
    Secret.createPin((err, data) => {
      Code.expect(err).to.not.exist();
      Code.expect(data.plain).to.exist();
      Code.expect(data.plain.length).to.equal(6);

      done();
    });
  });

  lab.test('it hashes a value', (done) => {
    Secret.hash('123456', (err, data) => {
      Code.expect(err).to.not.exist();
      Code.expect(data.plain).to.equal('123456');

      done();
    });
  });

  lab.test('it goes boom when hashing a value fails', (done) => {
    const genSalt = stub.Bcrypt.genSalt;

    stub.Bcrypt.genSalt = function () {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();

      stub.Bcrypt.genSalt = genSalt;
      callback(Error('sorry pal'));
    };

    Secret.hash('123456', (err, data) => {
      Code.expect(err).to.exist();
      Code.expect(data).to.not.exist();

      done();
    });
  });

  lab.test('it compares sucessfully', (done) => {
    const value = '654321';

    Secret.hash(value, (_, data) => {
      Secret.compare(value, data.hash, (err, pass) => {
        Code.expect(err).to.not.exist();
        Code.expect(pass).to.equal(true);

        done();
      });
    });
  });
});
