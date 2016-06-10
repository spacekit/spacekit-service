'use strict';
const Hapi = require('hapi');
const Inert = require('inert');
const Path = require('path');

module.exports = function (server) {
  const web = new Hapi.Server();

  web.connection({
    listener: server
  });

  const plugins = [Inert];

  web.register(plugins, (err) => {
    /* $lab:coverage:off$ */
    if (err) {
      throw err;
    }
    /* $lab:coverage:on$ */
  });

  web.route({
    method: 'GET',
    path: '/{param*}',
    handler: {
      directory: {
        path: Path.resolve(__dirname, 'static'),
        redirectToSlash: true,
        index: true
      }
    }
  });

  return web;
};

// 'use strict';
// const Express = require('express');
// const Path = require('path');
// const ServeStatic = require('serve-static');
// const Uuid = require('node-uuid');
//
// const CreateLogger = require('../create-logger');
//
// const log = CreateLogger('WebApp');
//
// module.exports = function (config) {
//   const www = Express();
//
//   // If running behind a proxy, ensure we see the correct protocol for
//   // redirection. See <http://stackoverflow.com/questions/7013098>.
//   www.set('trust proxy', true);
//
//   // We must use "www."
//   www.use((req, res, next) => {
//     if (req.headers.host.slice(0, 4) !== 'www.') {
//       let newHost = 'www.' + req.headers.host;
//       res.redirect(301, req.protocol + '://' + newHost + req.originalUrl);
//     } else {
//       next();
//     }
//   });
//
//   www.use((req, res, next) => {
//     req.log = log.child({ reqId: Uuid.v4() });
//     next();
//   });
//
//   www.use(ServeStatic(Path.join(__dirname, 'static')));
//
//   return www;
// };
