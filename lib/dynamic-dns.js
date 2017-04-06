'use strict';
const AWS = require('aws-sdk');
const Config = require('./config');
const CreateLogger = require('./create-logger');
const Dns = require('dns');

AWS.config.update({
  accessKeyId: Config.get('/aws/accessKeyId'),
  secretAccessKey: Config.get('/aws/secretAccessKey')
});

const log = CreateLogger('DynamicDns');
const route53 = new AWS.Route53();
const dnsCache = new Map();
const apiHostname = Config.get('/service/subdomains/api');

class DynamicDns {
  /**
   * Resolves a hostname to IPv4, caches results.
   */
  static resolveDns (hostname, callback) {
    const cacheHit = dnsCache.get(hostname);

    if (cacheHit) {
      return callback(null, cacheHit);
    }

    Dns.resolve4(hostname, (err, addresses) => {
      if (err) {
        return callback(err);
      }

      dnsCache.set(hostname, addresses[0]);

      callback(null, addresses[0]);
    });
  }

  /**
   * Upsert individual hostname records using AWS Route53.
   */
  static upsert (hostname, callback) {
    DynamicDns.resolveDns(apiHostname, (err, ipAddress) => {
      if (err) {
        log.error(err, 'dns resolve error');
        return callback(err);
      }

      const params = {
        ChangeBatch: {
          Changes: [{
            Action: 'UPSERT',
            ResourceRecordSet: {
              Name: hostname,
              Type: 'A',
              ResourceRecords: [{
                Value: ipAddress
              }],
              TTL: Config.get('/aws/recordSetTtl')
            }
          }],
          Comment: hostname + ' -> ' + ipAddress
        },
        HostedZoneId: Config.get('/aws/hostedZoneId')
      };

      log.info(`${hostname} => ${ipAddress}`);

      route53.changeResourceRecordSets(params, callback);
    });
  }
}

module.exports = DynamicDns;
