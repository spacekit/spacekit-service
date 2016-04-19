'use strict';
const Async = require('async');
const Bcrypt = require('bcrypt');
const ValidEmail = require('email-validator').validate;
const Uuid = require('node-uuid');

module.exports = function SignUp (req, res) {
  let reply = {
    success: false,
    errors: [],
    apiKey: null
  };

  Async.auto({
    username: function (done, results) {
      let validationError = Error('Username validation failed.');

      if (!req.body.hasOwnProperty('username')) {
        reply.errors.push('`username` is required');
      } else if (req.body.username.length < 4) {
        reply.errors.push('`username` must be at least 4 characters');
      } else if (!/^[a-zA-Z0-9\-\_]+$/.test(req.body.username)) {
        reply.errors.push('`username` should only contain letters, numbers, \'-\', \'_\'');
      }

      if (reply.errors.length > 0) {
        res.status(400);
        return done(validationError);
      }

      let username = req.body.username;
      let query = 'SELECT id FROM users WHERE username = $1';

      req.app.db.run(query, [username], (err, result) => {
        if (err) {
          res.status(500);
          reply.errors.push('exception encountered');
          return done(err);
        }

        if (result.rows.length !== 0) {
          res.status(400);
          reply.errors.push(`\`username\` (${username}) already in use`);
          return done(validationError);
        }

        done(null, username);
      });
    },
    email: ['username', function (done, results) {
      let validationError = Error('Email validation failed.');

      if (!req.body.hasOwnProperty('email')) {
        reply.errors.push('`email` is required');
      } else if (!ValidEmail(req.body.email)) {
        reply.errors.push('`email` has an invalid format');
      }

      if (reply.errors.length > 0) {
        res.status(400);
        return done(validationError);
      }

      let email = req.body.email;
      let query = 'SELECT id FROM users WHERE email = $1';

      req.app.db.run(query, [email], (err, result) => {
        if (err) {
          res.status(500);
          reply.errors.push('exception encountered');
          return done(err);
        }

        if (result.rows.length !== 0) {
          res.status(400);
          reply.errors.push(`\`email\` (${email}) already in use`);
          return done(validationError);
        }

        done(null, email);
      });
    }],
    apiKey: ['username', 'email', function (done, results) {
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
    user: ['apiKey', function (done, results) {
      let query = `
        INSERT INTO users (username, email, api_key)
        VALUES ($1, $2, $3)
      `;
      let params = [
        results.username,
        results.email,
        results.apiKey.hash
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
