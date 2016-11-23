'use strict';
const Express = require('express');
const Path = require('path');
const ServeStatic = require('serve-static');
const Uuid = require('uuid');

const CreateLogger = require('../create-logger');

const log = CreateLogger('WebApp');

module.exports = function (config) {
  const www = Express();

  // If running behind a proxy, ensure we see the correct protocol for
  // redirection. See <http://stackoverflow.com/questions/7013098>.
  www.set('trust proxy', true);

  // We must use "www."
  www.use((req, res, next) => {
    if (req.headers.host.slice(0, 4) !== 'www.') {
      let newHost = 'www.' + req.headers.host;
      res.redirect(301, req.protocol + '://' + newHost + req.originalUrl);
    } else {
      next();
    }
  });

  www.use((req, res, next) => {
    req.log = log.child({ reqId: Uuid.v4() });
    next();
  });

  www.use(ServeStatic(Path.join(__dirname, 'static')));

  return www;
};
