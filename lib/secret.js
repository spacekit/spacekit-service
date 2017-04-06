'use strict';
const Async = require('async');
const Bcrypt = require('bcrypt');
const Crypto = require('crypto');
const Uuid = require('node-uuid');

class Secret {
  static createUuid (callback) {
    this.hash(Uuid.v4(), callback);
  }

  static createPin (callback) {
    const rBytes = Crypto.randomBytes(3).toString('hex');
    const rNum = parseInt(rBytes, 16) / Math.pow(256, 3);
    const pin = Math.floor(rNum * 899999 + 100000);

    this.hash(pin, callback);
  }

  static hash (value, callback) {
    value = String(value).toString();

    Async.auto({
      salt: function (done) {
        Bcrypt.genSalt(10, done);
      },
      hash: ['salt', function (results, done) {
        Bcrypt.hash(value, results.salt, done);
      }]
    }, (err, results) => {
      if (err) {
        return callback(err);
      }

      callback(null, {
        plain: value,
        hash: results.hash
      });
    });
  }

  static compare (plain, hash, callback) {
    plain = String(plain).toString();
    hash = String(hash).toString();

    Bcrypt.compare(plain, hash, callback);
  }
}

module.exports = Secret;
