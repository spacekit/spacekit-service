'use strict';

exports.register = function (server, options, next) {
  server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
      reply({ message: 'Welcome to the SpaceKit api.' });
    }
  });

  next();
};

exports.register.attributes = {
  name: 'hello'
};
