'use strict';
const AWS = require('aws-sdk');

const CreateLogger = require('./create-logger');

const log = CreateLogger('DynamicDns');

/**
 * A wrapper for Amazon Route 53's DNS service, for the sole purpose of
 * upserting individual hostname records.
 */
class DynamicDns {
  constructor (config) {
    this.config = config;

    // TODO: since this is global, should it be done in the SpaceKitService
    // constructor?
    AWS.config.update({
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey
    });

    this.route53 = new AWS.Route53();
  }

  upsert (options, callback) {
    let params = {
      ChangeBatch: {
        Changes: [{
          Action: 'UPSERT',
          ResourceRecordSet: {
            Name: options.hostname,
            Type: options.recordType,
            ResourceRecords: [{
              Value: options.recordValue
            }],
            TTL: this.config.awsRecordSetTtl
          }
        }],
        Comment: options.hostname + ' -> ' + options.recordValue
      },
      HostedZoneId: this.config.awsHostedZoneId
    };

    log.info(`${options.hostname} => ${options.recordValue}`);

    this.route53.changeResourceRecordSets(params, callback);
  }
}

module.exports = DynamicDns;
