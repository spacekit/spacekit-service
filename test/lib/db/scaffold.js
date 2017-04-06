'use strict';
const Code = require('code');
const DbScaffold = require('../../../lib/db/scaffold');
const Lab = require('lab');

const lab = exports.lab = Lab.script();

lab.before((done) => {
  DbScaffold.setup(done);
});

lab.after((done) => {
  DbScaffold.clear(done);
});

lab.experiment('Scaffold', () => {
  lab.test('it runs setup successfully', (done) => {
    DbScaffold.setup((err) => {
      Code.expect(err).to.not.exist();

      done();
    });
  });

  lab.test('it runs setup unsuccessfully when tear down fails', (done) => {
    const tearDown = DbScaffold.tearDown;

    DbScaffold.tearDown = function () {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();

      DbScaffold.tearDown = tearDown;
      callback(Error('sorry pal'));
    };

    DbScaffold.setup((err) => {
      Code.expect(err).to.exist();

      done();
    });
  });

  lab.test('it runs clear successfully', (done) => {
    DbScaffold.clear((err) => {
      Code.expect(err).to.not.exist();

      done();
    });
  });
});
