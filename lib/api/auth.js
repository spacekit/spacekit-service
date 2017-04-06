'use strict';
const Async = require('async');
const Boom = require('boom');
const Joi = require('joi');
const Mailer = require('../mailer');
const Secret = require('../secret');
const Session = require('../db/session');
const User = require('../db/user');

exports.register = function (server, options, next) {
  server.route({
    method: 'POST',
    path: '/auth/challenge',
    config: {
      validate: {
        payload: {
          username: Joi.string().token().lowercase().required(),
          email: Joi.string().email().lowercase().required()
        }
      },
      pre: [{
        assign: 'userLookup',
        method: function (request, reply) {
          const username = request.payload.username;
          const email = request.payload.email;

          User.findOneByCredentials(username, email, (err, user) => {
            if (err) {
              return reply(Boom.badImplementation('exception', err));
            }

            if (!user) {
              return reply(Boom.conflict('User not found.'));
            }

            reply(user);
          });
        }
      }]
    },
    handler: function (request, reply) {
      Async.auto({
        pin: function (done) {
          Secret.createPin(done);
        },
        challenge: ['pin', function (results, done) {
          const userId = request.pre.userLookup.id;
          const challenge = results.pin.hash;
          const expires = new Date(Date.now() + 10000000);

          User.setChallenge(userId, challenge, expires, done);
        }],
        sendMail: ['challenge', function (results, done) {
          const options = {
            subject: 'SpaceKit auth challenge',
            to: request.pre.userLookup.email
          };
          const template = 'auth-challenge';
          const context = {
            pin: results.pin.plain
          };

          Mailer.sendEmail(options, template, context, done);
        }]
      }, (err, results) => {
        if (err) {
          return reply(Boom.badImplementation('exception', err));
        }

        const message = 'An email will be sent with a challenge code.';

        reply({ message: message });
      });
    }
  });

  server.route({
    method: 'POST',
    path: '/auth/answer',
    config: {
      validate: {
        payload: {
          username: Joi.string().token().lowercase().required(),
          email: Joi.string().email().lowercase().required(),
          pin: Joi.number().integer().min(100000).max(999999).required()
        }
      },
      pre: [{
        assign: 'userLookup',
        method: function (request, reply) {
          const username = request.payload.username;
          const email = request.payload.email;

          User.findOneByCredentials(username, email, (err, user) => {
            if (err) {
              return reply(Boom.badImplementation('exception', err));
            }

            if (!user) {
              return reply(Boom.conflict('User not found.'));
            }

            if (user.challenge === null) {
              return reply(Boom.conflict('Challenge not set.'));
            }

            const expiration = new Date(user.challenge_expires);

            if (expiration < new Date()) {
              return reply(Boom.conflict('Challenge expired.'));
            }

            reply(user);
          });
        }
      }, {
        assign: 'comparePin',
        method: function (request, reply) {
          const pin = request.payload.pin;
          const pinHash = request.pre.userLookup.challenge;

          Secret.compare(pin, pinHash, (err, pass) => {
            if (err) {
              return reply(Boom.badImplementation('exception', err));
            }

            if (!pass) {
              return reply(Boom.conflict('Incorrect pin.'));
            }

            reply(true);
          });
        }
      }]
    },
    handler: function (request, reply) {
      Async.auto({
        disableChallenge: function (done) {
          const userId = request.pre.userLookup.id;
          const challenge = null;
          const expires = new Date();

          User.setChallenge(userId, challenge, expires, done);
        },
        authKey: function (done) {
          Secret.createUuid(done);
        },
        session: ['authKey', function (results, done) {
          const userId = request.pre.userLookup.id;
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
  name: 'auth'
};
