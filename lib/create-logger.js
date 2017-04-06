'use strict';
const Bunyan = require('bunyan');
const Config = require('./config');
const Path = require('path');

const log = Bunyan.createLogger({
  name: 'SpaceKitService',
  level: Config.get('/debug/logLevel'),
  streams: [{
    stream: process.stdout
  }, {
    type: 'rotating-file',
    path: Path.resolve(process.cwd(), 'spacekit-service.log'),
    period: '1d', // daily
    count: 3 // three rotations
  }]
});

module.exports = function createLogger (name) {
  return log.child({ module: name });
};
