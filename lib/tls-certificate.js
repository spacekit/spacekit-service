'use strict';
const Config = require('./config');
const CreateLogger = require('./create-logger');
const LetsEncrypt = require('letsencrypt');
const Path = require('path');
const Tls = require('tls');

const log = CreateLogger('TlsCertificate');

class TlsCertificate {
  constructor (hostname) {
    this.hostname = hostname;
    this._pems = null;
    this.RENEW_IF_EXPIRES_WITHIN_MS = 1000 * 60 * 60 * 24 * 7;
    this.challengeValue = null;

    const leConfig = {
      server: LetsEncrypt.productionServerUrl,
      configDir: Path.resolve(process.cwd(), 'certs'),
      privkeyPath: ':config/live/:hostname/privkey.pem',
      fullchainPath: ':config/live/:hostname/fullchain.pem',
      certPath: ':config/live/:hostname/cert.pem',
      chainPath: ':config/live/:hostname/chain.pem',
      debug: false
    };
    const leHandlers = {
      setChallenge: (args, key, value, callback) => {
        this.challengeValue = value;
        callback(null);
      },
      getChallenge: (args, key, callback) => {
        callback(null, this.challengeValue);
      },
      removeChallenge: (args, key, callback) => {
        this.challengeValue = null;
        callback(null);
      }
    };

    this.le = LetsEncrypt.create(leConfig, leHandlers);

    // TODO: create an interval Call to `ensureValidCertificate` so we
    // don't block requests when we have to renew
  }

  getSecureContext (callback) {
    this.ensureValidCertificate((err, pems) => {
      if (err) {
        log.error('Secure context fail', err);
        return callback(err);
      }

      log.debug('Secure context', this.hostname, pems.expiresAt);

      const secureContext = Tls.createSecureContext({
        key: pems.privkey,
        cert: pems.fullchain,
        ca: pems.ca
      });

      callback(null, secureContext);
    });
  }

  ensureValidCertificate (callback) {
    this.fetchPems((err, pems) => {
      if (err) {
        return this.registerCertificate(callback);
      }

      if (pems.expiresAt < Date.now() + this.RENEW_IF_EXPIRES_WITHIN_MS) {
        log.warn(`Certificate expiration is stale: ${pems.expiresAt}`);
        return this.registerCertificate(callback);
      }

      callback(null, pems);
    });
  }

  fetchPems (callback) {
    if (this._pems) {
      log.info('Fetching pems from cache', this.hostname);
      return callback(null, this._pems);
    }

    log.info('Fetching pems from disk', this.hostname);

    const options = {
      domains: [this.hostname]
    };

    this.le.fetch(options, (err, pems) => {
      if (err) {
        log.error(`Unable to fetch certificate: ${err}`);
        return callback(err);
      }

      if (!pems) {
        const error = Error('Certificates not found on disk.');
        return callback(error);
      }

      log.info(`Certificate fetched! Expires ${pems.expiresAt}`);

      this._pems = pems;

      callback(null, pems);
    });
  }

  registerCertificate (callback) {
    log.info('Registering cert', this.hostname);

    const config = {
      domains: [this.hostname],
      email: Config.get('/letsEncrypt/email'),
      agreeTos: true
    };

    this.le.register(config, (err, pems) => {
      if (err) {
        log.error(`Unable to register certificate: ${err}`);
        return callback(err);
      }

      log.info(`Certificate registered! Expires ${pems.expiresAt}`);

      this._pems = pems;

      callback(null, pems);
    });
  }
}

module.exports = TlsCertificate;
