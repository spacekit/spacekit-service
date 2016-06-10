'use strict';
const Code = require('code');
const DbScaffold = require('../../../lib/db/scaffold');
const Lab = require('lab');
const Stat = require('../../../lib/db/stat');

const lab = exports.lab = Lab.script();

lab.before((done) => {
  DbScaffold.setup(done);
});

lab.after((done) => {
  DbScaffold.clear(done);
});

lab.experiment('Stat', () => {
  lab.test('it increments a stat', (done) => {
    const key = 'bytes';
    const increment = 100;

    Stat.increment(key, increment, (err, results) => {
      Code.expect(err).to.not.exist();
      Code.expect(results).to.exist();

      done();
    });
  });
});
