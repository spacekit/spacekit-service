'use strict';
const Async = require('async');
const Bcrypt = require('bcrypt');

module.exports = function Ping (req, res) {
  let reply = {
    success: false,
    errors: []
  };

  Async.auto({
    validate: function (done) {
      if (!req.header('x-spacekit-subdomain')) {
        reply.errors.push('`subdomain` header is required');
      }

      if (!req.header('x-spacekit-username')) {
        reply.errors.push('`username` header is required');
      }

      if (!req.header('x-spacekit-apikey')) {
        reply.errors.push('`apikey` header is required');
      }

      if (reply.errors.length === 0) {
        done();
      } else {
        res.status(400);
        done(Error('Validation failed.'));
      }
    },
    userLookup: ['validate', function (done, results) {
      let username = req.header('x-spacekit-username');
      let query = 'SELECT id, api_key FROM users WHERE username = $1';

      req.app.db.run(query, [username], (err, result) => {
        if (err) {
          res.status(500);
          reply.errors.push('exception encountered');
          return done(err);
        }

        let failMessage = 'either the api key is invalid ' +
                          'or the username is incorrect';

        if (result.rows.length === 0) {
          res.status(401);
          reply.errors.push(failMessage);
          return done(Error('User not found.'));
        }

        let apiKey = req.header('x-spacekit-apikey');
        let apiKeyHash = result.rows[0].api_key;

        Bcrypt.compare(apiKey, apiKeyHash, (err, pass) => {
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

          done();
        });
      });
    }],
    updateDns: ['userLookup', function (done, results) {
      let subdomain = req.header('x-spacekit-subdomain');
      let username = req.header('x-spacekit-username');
      let hostname = `${subdomain}.${username}.${req.app.config.host}`;
      let ip = req.header('x-forwarded-for') || req.connection.remoteAddress;

      // TODO: support both ipv4 (A) and ipv6 (AAAA)
      ip = ip.replace('::ffff:', '');

      if (req.app.dynamicDns) {
        let options = {
          hostname: hostname,
          recordType: 'A',
          recordValue: ip
        };

        req.app.dynamicDns.upsert(options, (err, data) => {
          if (err) {
            res.status(500);
            reply.errors.push('exception encountered');
            return done(err);
          }

          reply.success = true;
          done();
        });
      }
    }]
  }, (err, results) => {
    if (err) {
      req.log.error(err);
    }

    res.json(reply);
  });
};
