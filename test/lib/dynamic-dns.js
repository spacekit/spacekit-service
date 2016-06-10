'use strict';
const Code = require('code');
const Lab = require('lab');
const Proxyquire = require('proxyquire');

const lab = exports.lab = Lab.script();
const stub = {
  AWS: {
    changeResourceRecordSets: function (params, callback) {
      callback();
    },
    Route53: function () {
      return {
        changeResourceRecordSets: function () {
          stub.AWS.changeResourceRecordSets.apply(null, arguments);
        }
      };
    }
  }
};
const DynamicDns = Proxyquire('../../lib/dynamic-dns', {
  'aws-sdk': stub.AWS
});

lab.experiment('DynamicDns resolve dns', () => {
  lab.test('it resolves dns for first and uses cache after', (done) => {
    const hostname = 'google.com';

    DynamicDns.resolveDns(hostname, (err, ipAddress) => {
      Code.expect(err).to.not.exist();
      Code.expect(ipAddress).to.exist();

      DynamicDns.resolveDns(hostname, (err, ipAddress) => {
        Code.expect(err).to.not.exist();
        Code.expect(ipAddress).to.exist();

        done();
      });
    });
  });

  lab.test('it goes boom when dns resolve4 fails', (done) => {
    const hostname = 'sorry.extension';

    DynamicDns.resolveDns(hostname, (err, ipAddress) => {
      Code.expect(err).to.exist();

      done();
    });
  });
});

lab.experiment('DynamicDns upsert', () => {
  lab.test('it calls the aws route53 api correctly', (done) => {
    const hostname = 'youwish.pal.spacekit.io';

    DynamicDns.upsert(hostname, () => {
      done();
    });
  });

  lab.test('it goes boom when dns resolution fails', (done) => {
    const hostname = 'youwish.pal.spacekit.io';
    const resolveDns = DynamicDns.resolveDns;

    DynamicDns.resolveDns = function (hostname, callback) {
      DynamicDns.resolveDns = resolveDns;

      callback(Error('sorry pal'));
    };

    DynamicDns.upsert(hostname, (err) => {
      Code.expect(err).to.exist();

      done();
    });
  });
});
