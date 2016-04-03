'use strict';
const BodyParser = require('body-parser');
const Express = require('express');
const Uuid = require('node-uuid');

const CreateLogger = require('../create-logger');
const Db = require('../util/db');
const DynamicDns = require('../dynamic-dns');
const Mailer = require('../util/mailer');
const Ping = require('./ping');
const Recover = require('./recover');
const Reset = require('./reset');
const SignUp = require('./signup');

const log = CreateLogger('ApiApp');

module.exports = function (config) {
  let api = Express();

  api.config = config;
  api.mailer = new Mailer(config);
  api.db = new Db(config);
  if (config.awsHostedZoneId) {
    api.dynamicDns = new DynamicDns(config);
  }

  api.use(BodyParser.json());
  api.use(BodyParser.urlencoded({ extended: true }));

  api.use(function (req, res, next) {
    req.log = log.child({ reqId: Uuid.v4() });
    next();
  });

  api.get('/', (req, res, next) => {
    res.json({ message: 'Welcome to the SpaceKit api.' });
  });

  api.get('/ping', Ping);
  api.post('/recover', Recover);
  api.post('/reset', Reset);
  api.post('/signup', SignUp);

  return api;
};
