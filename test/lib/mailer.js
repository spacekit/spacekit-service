'use strict';
const Code = require('code');
const Lab = require('lab');
const Proxyquire = require('proxyquire');

const lab = exports.lab = Lab.script();
const stub = {
  fs: {},
  nodemailer: {
    createTransport: function (smtp) {
      return {
        use: function () {
          return;
        },
        sendMail: function (options, callback) {
          return callback(null, {});
        }
      };
    }
  }
};
const Mailer = Proxyquire('../../lib/mailer', {
  'fs': stub.fs,
  'nodemailer': stub.nodemailer
});

lab.experiment('Mailer', () => {
  lab.test('it returns error when read file fails', (done) => {
    const readFile = stub.fs.readFile;

    stub.fs.readFile = function () {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();

      stub.fs.readFile = readFile;
      callback(Error('read file failed'));
    };

    Mailer.sendEmail({}, 'path', {}, (err, info) => {
      Code.expect(err).to.be.an.object();

      done();
    });
  });

  lab.test('it sends an email', (done) => {
    const readFile = stub.fs.readFile;

    stub.fs.readFile = function () {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();

      stub.fs.readFile = readFile;
      callback(null, '');
    };

    Mailer.sendEmail({}, 'path', {}, (err, info) => {
      Code.expect(err).to.not.exist();
      Code.expect(info).to.be.an.object();

      done();
    });
  });

  lab.test('it returns early with the template is cached', (done) => {
    const readFile = stub.fs.readFile;

    stub.fs.readFile = function () {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();

      stub.fs.readFile = readFile;
      callback(null, '');
    };

    Mailer.sendEmail({}, 'path', {}, (err, info) => {
      Code.expect(err).to.not.exist();
      Code.expect(info).to.be.an.object();

      done();
    });
  });
});
