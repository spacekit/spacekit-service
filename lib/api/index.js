'use strict';
const Auth = require('./auth');
const Hapi = require('hapi');
const Hello = require('./hello');
const Signup = require('./signup');

module.exports = function (server) {
  const api = new Hapi.Server();

  api.connection({
    listener: server
  });

  const plugins = [Auth, Hello, Signup];

  api.register(plugins, (err) => {
    /* $lab:coverage:off$ */
    if (err) {
      throw err;
    }
    /* $lab:coverage:on$ */
  });

  return api;
};
