'use strict';
const Confidence = require('confidence');
const LetsEncrypt = require('letsencrypt');
const Path = require('path');

let conf = {};
try {
  const path = Path.resolve(process.cwd(), 'spacekit-service.json');
  conf = require(path);
} catch (e) {}
conf = new Confidence.Store(conf);

const criteria = {
  env: process.env.NODE_ENV
};

const config = {
  debug: {
    logLevel: {
      $filter: 'env',
      test: 'fatal',
      $default: conf.get('/logLevel')
    }
  },
  letsEncrypt: {
    email: conf.get('/letsEncrypt/email'),
    serverUrl: {
      $filter: 'env',
      test: LetsEncrypt.stagingServerUrl,
      $default: LetsEncrypt.productionServerUrl
    }
  },
  postgres: {
    uri: {
      $filter: 'env',
      test: 'postgres://postgres:mysecretpassword@localhost/spacekit_test',
      $default: conf.get('/postgres')
    }
  },
  service: {
    domain: {
      $filter: 'env',
      test: 'spacekit.io',
      $default: conf.get('/service/domain')
    },
    subdomains: {
      $filter: 'env',
      test: {
        api: 'api.spacekit.io',
        web: 'www.spacekit.io'
      },
      $default: {
        api: conf.get('/service/subdomains/api'),
        web: conf.get('/service/subdomains/web')
      }
    },
    ports: {
      http: {
        $filter: 'env',
        test: 8080,
        $default: conf.get('/service/ports/http')
      },
      https: {
        $filter: 'env',
        test: 8443,
        $default: conf.get('/service/ports/https')
      },
      range: {
        $filter: 'env',
        test: {
          start: 9100,
          end: 9199
        },
        $default: {
          start: conf.get('/service/ports/range/start'),
          end: conf.get('/service/ports/range/end')
        }
      }
    }
  },
  aws: {
    hostedZoneId: conf.get('/aws/hostedZoneId'),
    accessKeyId: conf.get('/aws/accessKeyId'),
    secretAccessKey: conf.get('/aws/secretAccessKey'),
    recordSetTtl: conf.get('/aws/recordSetTtl')
  },
  mail: {
    from: {
      name: conf.get('/mail/from/name'),
      address: conf.get('/mail/from/address')
    }
  },
  nodemailer: {
    host: conf.get('/smtp/host'),
    port: conf.get('/smtp/port'),
    secure: conf.get('/smtp/secure'),
    auth: {
      user: conf.get('/smtp/user'),
      pass: conf.get('/smtp/pass')
    }
  }
};

const store = new Confidence.Store(config);

exports.get = function (key) {
  return store.get(key, criteria);
};
