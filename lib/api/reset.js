'use strict';
const Async = require('async');
const Bcrypt = require('bcrypt');
const ValidEmail = require('email-validator').validate;
const Uuid = require('uuid');

module.exports = function Reset (req, res) {
  let reply = {
    success: false,
    errors: [],
    apiKey: null
  };

  Async.auto({
    validate: function (done) {
      if (!req.body.hasOwnProperty('email')) {
        reply.errors.push('`email` is required');
      } else if (!ValidEmail(req.body.email)) {
        reply.errors.push('`email` has an invalid format');
      }

      if (!req.body.hasOwnProperty('token')) {
        reply.errors.push('`token` is required');
      }

      if (reply.errors.length === 0) {
        done();
      } else {
        res.status(400);
        done(Error('Validation failed.'));
      }
    },
    userLookup: ['validate', function (done, results) {
      let query = `
        SELECT id, reset_token FROM users
        WHERE email = $1 AND reset_expires > $2
      `;
      let params = [
        req.body.email,
        new Date()
      ];

      req.app.db.run(query, params, (err, result) => {
        if (err) {
          res.status(500);
          reply.errors.push('exception encountered');
          return done(err);
        }

        let failMessage = 'either the reset token is invalid ' +
                          'or the email address is incorrect';

        if (result.rows.length === 0) {
          res.status(401);
          reply.errors.push(failMessage);
          return done(Error('User not found.'));
        }

        let token = req.body.token;
        let tokenHash = result.rows[0].reset_token;

        Bcrypt.compare(token, tokenHash, (err, pass) => {
          if (err) {
            res.status(500);
            reply.errors.push('exception encountered');
            return done(err);
          }

          if (!pass) {
            res.status(401);
            reply.errors.push(failMessage);
            return done(Error('Bcrypt compare failed.'));
          }

          done(null, result.rows[0]);
        });
      });
    }],
    apiKey: ['userLookup', function (done, results) {
      let uuid = Uuid.v4();

      Async.auto({
        salt: function (done) {
          Bcrypt.genSalt(10, done);
        },
        hash: ['salt', function (done, results) {
          Bcrypt.hash(uuid, results.salt, done);
        }]
      }, (err, results) => {
        if (err) {
          res.status(500);
          return done(err);
        }

        done(null, {
          plain: uuid,
          hash: results.hash
        });
      });
    }],
    updateUser: ['apiKey', function (done, results) {
      let query = `
        UPDATE users
        SET
          api_key = $1,
          reset_token = NULL,
          reset_expires = NULL
        WHERE id = $2
      `;
      let params = [
        results.apiKey.hash,
        results.userLookup.id
      ];

      req.app.db.run(query, params, (err, result) => {
        if (err) {
          res.status(500);
          reply.errors.push('exception encountered');
          return done(err);
        }

        reply.success = true;
        reply.apiKey = results.apiKey.plain;

        done();
      });
    }]
  }, (err, results) => {
    if (err) {
      req.log.error(err);
    }

    res.json(reply);
  });
};
