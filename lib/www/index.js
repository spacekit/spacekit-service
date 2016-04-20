'use strict';
const Express = require('express');
const Path = require('path');
const ServeStatic = require('serve-static');
const Uuid = require('node-uuid');

const CreateLogger = require('../create-logger');

const log = CreateLogger('WebApp');

module.exports = function (config) {
  const www = Express();

  www.use((req, res, next) => {
    req.log = log.child({ reqId: Uuid.v4() });
    next();
  });

  www.use(ServeStatic(Path.join(__dirname, 'static')));

  return www;
};
