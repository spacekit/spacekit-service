'use strict';
const Code = require('code');
const Lab = require('lab');
const Pem = require('pem');
const Proxyquire = require('proxyquire');

const lab = exports.lab = Lab.script();
const getSelfSignedCert = function (options, callback) {
  if (getSelfSignedCert.mock) {
    getSelfSignedCert.mock.apply(this, arguments);
    return;
  }

  const config = {
    days: 90,
    commonName: options.domains[0]
  };

  Pem.createCertificate(config, (err, keys) => {
    if (err) {
      return callback(err);
    }

    const cert = {
      privkey: keys.serviceKey,
      fullchain: keys.certificate,
      ca: undefined,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 90
    };

    callback(null, cert);
  });
};
const leInstanceArgs = {
  config: undefined,
  handlers: undefined
};
const stub = {
  LetsEncrypt: {
    create: function (config, handlers) {
      leInstanceArgs.config = config;
      leInstanceArgs.handlers = handlers;

      return {
        fetch: getSelfSignedCert,
        register: getSelfSignedCert
      };
    }
  }
};
const TlsCertificate = Proxyquire('../../lib/tls-certificate', {
  'letsencrypt': stub.LetsEncrypt
});
const domain = 'test.spacekit.io';

lab.experiment('TlsCertificate', () => {
  lab.test('it creates a new TlsCertificate instance', (done) => {
    const tlsCertificate = new TlsCertificate(domain);

    Code.expect(tlsCertificate).to.exist();

    done();
  });

  lab.test('it processes the lets encrypt challenge handlers', (done) => {
    const tlsCertificate = new TlsCertificate(domain);

    Code.expect(tlsCertificate).to.exist();

    leInstanceArgs.handlers.setChallenge(null, null, '123', (err) => {
      Code.expect(err).to.not.exist();

      leInstanceArgs.handlers.getChallenge(null, null, (err, value) => {
        Code.expect(err).to.not.exist();
        Code.expect(value).to.equal('123');

        leInstanceArgs.handlers.removeChallenge(null, null, (err) => {
          Code.expect(err).to.not.exist();

          done();
        });
      });
    });
  });
});

lab.experiment('TlsCertificate registration', () => {
  lab.test('it registers a certificate successfully', (done) => {
    const tlsCertificate = new TlsCertificate(domain);

    tlsCertificate.registerCertificate((err, pems) => {
      Code.expect(err).to.not.exist();
      Code.expect(pems).to.exist();

      done();
    });
  });

  lab.test('it goes boom when registration fails', (done) => {
    getSelfSignedCert.mock = function (config, callback) {
      getSelfSignedCert.mock = undefined;

      callback(Error('sorry pal'));
    };

    const tlsCertificate = new TlsCertificate(domain);

    tlsCertificate.registerCertificate((err, pems) => {
      Code.expect(err).to.exist();

      done();
    });
  });
});

lab.experiment('TlsCertificate fetch pems', () => {
  lab.test('it fetches pems from disk and then from cache', (done) => {
    const tlsCertificate = new TlsCertificate(domain);

    tlsCertificate.fetchPems((err, pems) => {
      Code.expect(err).to.not.exist();
      Code.expect(pems).to.exist();

      tlsCertificate.fetchPems((err, pems) => {
        Code.expect(err).to.not.exist();
        Code.expect(pems).to.exist();

        done();
      });
    });
  });

  lab.test('it goes boom when fetch returns null', (done) => {
    getSelfSignedCert.mock = function (options, callback) {
      getSelfSignedCert.mock = undefined;

      callback(null, null);
    };

    const tlsCertificate = new TlsCertificate(domain);

    tlsCertificate.fetchPems((err, pems) => {
      Code.expect(err).to.exist();

      done();
    });
  });

  lab.test('it goes boom when fetch fails', (done) => {
    getSelfSignedCert.mock = function (options, callback) {
      getSelfSignedCert.mock = undefined;

      callback(Error('sorry pal'));
    };

    const tlsCertificate = new TlsCertificate(domain);

    tlsCertificate.fetchPems((err, pems) => {
      Code.expect(err).to.exist();

      done();
    });
  });
});

lab.experiment('TlsCertificate ensure valid', () => {
  lab.test('it ensures a valid certificate', (done) => {
    const tlsCertificate = new TlsCertificate(domain);

    tlsCertificate.ensureValidCertificate((err, pems) => {
      Code.expect(err).to.not.exist();
      Code.expect(pems).to.exist();

      done();
    });
  });

  lab.test('it registers when fetch fails', (done) => {
    getSelfSignedCert.mock = function (options, callback) {
      getSelfSignedCert.mock = undefined;

      callback(Error('sorry pal'));
    };

    const tlsCertificate = new TlsCertificate(domain);

    tlsCertificate.ensureValidCertificate((err, pems) => {
      Code.expect(err).to.not.exist();
      Code.expect(pems).to.exist();

      done();
    });
  });

  lab.test('it registers if the renewal window is open', (done) => {
    getSelfSignedCert.mock = function (options, callback) {
      getSelfSignedCert.mock = undefined;

      const config = {
        days: 90,
        commonName: options.domains[0]
      };

      Pem.createCertificate(config, (err, keys) => {
        if (err) {
          return callback(err);
        }

        const cert = {
          privkey: keys.serviceKey,
          fullchain: keys.certificate,
          ca: undefined,
          expiresAt: Date.now()
        };

        callback(null, cert);
      });
    };

    const tlsCertificate = new TlsCertificate(domain);

    tlsCertificate.ensureValidCertificate((err, pems) => {
      Code.expect(err).to.not.exist();
      Code.expect(pems).to.exist();

      done();
    });
  });
});

lab.experiment('TlsCertificate secure context', () => {
  lab.test('it returns a secure context', (done) => {
    const tlsCertificate = new TlsCertificate(domain);

    tlsCertificate.getSecureContext((err, secureContext) => {
      Code.expect(err).to.not.exist();
      Code.expect(secureContext).to.exist();

      done();
    });
  });

  lab.test('it goes boom when ensure fails', (done) => {
    const tlsCertificate = new TlsCertificate(domain);
    const ensureValidCertificate = tlsCertificate.ensureValidCertificate;

    tlsCertificate.ensureValidCertificate = function (callback) {
      tlsCertificate.ensureValidCertificate = ensureValidCertificate;

      callback('sorry pal');
    };

    tlsCertificate.getSecureContext((err, secureContext) => {
      Code.expect(err).to.exist();

      done();
    });
  });
});
