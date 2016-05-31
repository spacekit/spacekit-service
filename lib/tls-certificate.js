'use strict';

const Pem = require('pem');
const Tls = require('tls');

const CreateLogger = require('./create-logger');
const log = CreateLogger('TlsCertificate');

let LetsEncrypt;
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0') {
  LetsEncrypt = require('letsencrypt');
} else {
  LetsEncrypt = {
    create () {
      return {
        fetch: getSelfSignedCertificate,
        register: getSelfSignedCertificate
      };
    }
  };
}

class TlsCertificate {

  constructor (hostname) {
    this.hostname = hostname;
    this._pems = null;
    this.RENEW_IF_EXPIRES_WITHIN_MS = 1000 * 60 * 60 * 24 * 7;

    this.challengeValue = null;

    this.le = LetsEncrypt.create({
      server: LetsEncrypt.productionServerUrl,
      configDir: './certs',
      privkeyPath: ':config/live/:hostname/privkey.pem',
      fullchainPath: ':config/live/:hostname/fullchain.pem',
      certPath: ':config/live/:hostname/cert.pem',
      chainPath: ':config/live/:hostname/chain.pem',
      debug: false
    }, {
      setChallenge: (args, key, value, cb) => {
        this.challengeValue = value;
        cb(null);
      },
      getChallenge: (args, key, cb) => {
        cb(null, this.challengeValue);
      },
      removeChallenge: (args, key, cb) => {
        this.challengeValue = null;
        cb(null);
      }
    });

    // TODO: Call ensureValidCertificate from an interval, to ensure
    // we don't block a request each time we have to renew.
  }

  processSniCallback (cb) {
    this.ensureValidCertificate()
      .then((pems) => {
        log.debug('SNI', this.hostname, pems.expiresAt);
        cb(null, Tls.createSecureContext({
          key: pems.privkey,
          cert: pems.fullchain,
          ca: pems.ca
        }));
      }, (err) => {
        log.error('SNI Fail', err);
        cb(err);
      });
  }

  handleAcmeChallengeSocket (socket, path) {
    socket.end('HTTP/1.0 200 OK\r\n\r\n' + this.challengeValue);
  }

  fetchFromCache () {
    return this._pems ? Promise.resolve(this._pems) : Promise.reject(this._pems);
  }

  fetchFromDisk () {
    return new Promise((resolve, reject) => {
      log.info('Fetching cert from disk', this.hostname);
      this.le.fetch({
        domains: [this.hostname]
      }, (err, pems) => { err ? reject(err) : resolve(pems); });
    });
  }

  ensureValidCertificate () {
    return this.fetchFromCache()
      .catch((err) => {
        if (err) {
          // ignored
        }
        return this.fetchFromDisk();
      })
      .then((pems) => {
        if (pems.expiresAt < Date.now() + this.RENEW_IF_EXPIRES_WITHIN_MS) {
          log.warn(`Certificate expires soon (or is already expired): ${pems.expiresAt}`);
          throw new Error('expiring');
        } else {
          return pems;
        }
      })
      .catch((err) => {
        if (err) {
          // ignored
        }
        // register/renew
        return new Promise((resolve, reject) => {
          log.info('LE register', this.hostname);
          this.le.register({
            domains: [this.hostname],
            email: 'spacekit.io@gmail.com',
            agreeTos: true
          }, (err, pems) => {
            log.info('LE result', !err);
            if (err) {
              reject(err);
            } else {
              resolve(pems);
            }
          });
        });
      })
      .then((pems) => {
        log.info(`Certificate is valid! Expires ${pems.expiresAt}`);
        this._pems = pems;
        return pems;
      }, (err) => {
        log.error(`Unable to obtain valid certificate: ${err}`);
        throw err;
      });
  }
}

function getSelfSignedCertificate (options, cb) {
  Pem.createCertificate({
    days: 90,
    commonName: options.domains[0]
  }, (err, keys) => {
    if (err) {
      cb(err);
    } else {
      cb(null, {
        privkey: keys.serviceKey,
        fullchain: keys.certificate,
        ca: undefined,
        expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 90
      });
    }
  });
}

module.exports = TlsCertificate;
