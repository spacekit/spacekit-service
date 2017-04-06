'use strict';
const Async = require('async');
const Boom = require('boom');
const Joi = require('joi');
const Secret = require('../secret');
const Session = require('../db/session');
const User = require('../db/user');

exports.register = function (server, options, next) {
  server.route({
    method: 'POST',
    path: '/signup',
    config: {
      validate: {
        payload: {
          username: Joi.string().token().lowercase().required(),
          email: Joi.string().email().lowercase().required()
        }
      },
      pre: [{
        assign: 'usernameCheck',
        method: function (request, reply) {
          const username = request.payload.username;

          User.findOneByUsername(username, (err, user) => {
            if (err) {
              return reply(Boom.badImplementation('exception', err));
            }

            if (user) {
              return reply(Boom.conflict('Username already in use.'));
            }

            reply(true);
          });
        }
      }, {
        assign: 'emailCheck',
        method: function (request, reply) {
          const email = request.payload.email;

          User.findOneByEmail(email, (err, user) => {
            if (err) {
              return reply(Boom.badImplementation('exception', err));
            }

            if (user) {
              return reply(Boom.conflict('Email already in use.'));
            }

            reply(true);
          });
        }
      }]
    },
    handler: function (request, reply) {
      Async.auto({
        user: function (done) {
          const username = request.payload.username;
          const email = request.payload.email;

          User.create(username, email, done);
        },
        authKey: function (done) {
          Secret.createUuid(done);
        },
        session: ['user', 'authKey', function (results, done) {
          const userId = results.user.id;
          const authKey = results.authKey.hash;

          Session.create(userId, authKey, done);
        }]
      }, (err, results) => {
        if (err) {
          return reply(Boom.badImplementation('exception', err));
        }

        reply({ authKey: results.authKey.plain });
      });
    }
  });

  next();
};

exports.register.attributes = {
  name: 'signup'
};
