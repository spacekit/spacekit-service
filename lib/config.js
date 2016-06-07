'use strict';
const Path = require('path');

let defaultConfig = {
  pg: null, // "postgres://username:password@host:port/dbname",
  smtpUser: null,
  smtpPass: null,
  smtpHost: 'smtp.gmail.com',
  smtpFrom: 'SpaceKit <spacekit.io@gmail.com>',
  awsHostedZoneId: null,
  awsAccessKeyId: null,
  awsSecretAccessKey: null,
  awsRecordSetTtl: 1,
  api: 'api',
  web: 'www',
  host: '127.0.0.1.nip.io',
  // The following are usually only overridden for testing:
  httpPort: 80,
  httpsPort: 443
};

let configFile = {};
try {
  let filePath = Path.resolve(process.cwd(), 'spacekit-service.json');
  configFile = require(filePath);
} catch (e) {}

let config = Object.assign({}, configFile, defaultConfig);

config.nodemailer = {
  host: config.smtpHost,
  port: config.smtpPort,
  secure: true,
  auth: {
    user: config.smtpUser,
    pass: config.smtpPass
  }
};

module.exports = config;
