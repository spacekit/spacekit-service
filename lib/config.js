'use strict';
const Path = require('path');
const Yargs = require('yargs');

let configFile = {};
try {
  let filePath = Path.resolve(process.cwd(), 'spacekit-service.json');
  configFile = require(filePath);
} catch (e) {}

const argv = Yargs
  .usage(`Usage: spacekit-service \\
       --pg $PG_CONN_STR \\
       --dns $HOSTED_ZONE_ID \\
       --apiKey /path/to/key --apiCert /path/to/cert \\
       --webKey /path/to/key --webCert /path/to/cert`)
  .options({
    pg: {
      required: true,
      describe: `the Postgres connection string
(ex: "postgres://username:password@host/database")`
    },
    api: {
      default: 'api',
      describe: `the api subdomain; uses value with <host> to create
the complete hostname (ex: <api>.<host>)`
    },
    apiKey: {
      required: true,
      describe: 'path to the api TLS key'
    },
    apiCert: {
      required: true,
      describe: 'path to the api TLS cert'
    },
    web: {
      default: 'www',
      describe: `the web subdomain; uses value with <host> to create
the complete hostname (ex: <web>.<host>)`
    },
    webKey: {
      required: true,
      describe: 'path to the web TLS key'
    },
    webCert: {
      required: true,
      describe: 'path to the web TLS cert'
    },
    dns: {
      default: process.env.HOSTED_ZONE_ID,
      describe: 'an AWS Hosted Zone ID (for dynamic DNS)'
    },
    host: {
      default: 'spacekit.io',
      describe: 'the root hostname of the service'
    },
    smtpHost: {
      default: 'smtp.gmail.com',
      describe: 'the smtp host'
    },
    smtpPort: {
      default: 465,
      describe: 'the smtp post'
    },
    smtpFrom: {
      default: 'SpaceKit <spacekit.io@gmail.com>',
      describe: 'the smtp from address'
    },
    smtpUser: {
      required: true,
      describe: 'the smtp username'
    },
    smtpPass: {
      required: true,
      describe: 'the smtp password'
    }
  })
  .default(configFile)
  .help()
  .argv;

argv.nodemailer = {
  host: argv.smtpHost,
  port: argv.smtpPort,
  secure: true,
  auth: {
    user: argv.smtpUser,
    pass: argv.smtpPass
  }
};

module.exports = argv;
