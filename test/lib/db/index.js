'use strict';
const Code = require('code');
const Db = require('../../../lib/db/index');
const DbScaffold = require('../../../lib/db/scaffold');
const Lab = require('lab');

const lab = exports.lab = Lab.script();

/*
 * There were issues using `proxyquire` to stub out `pg`. We exposed `pg` as
 * a property of the `Db` class so we can stub out `pg` methods manually.
 */

lab.before((done) => {
  DbScaffold.setup(done);
});

lab.after((done) => {
  DbScaffold.clear(done);
});

lab.experiment('Db run commands', () => {
  lab.test('it runs a command successfully', (done) => {
    const command = 'SELECT $1::text AS name;';

    Db.run(command, ['pal'], (err, results) => {
      Code.expect(err).to.not.exist();
      Code.expect(results).to.exist();

      done();
    });
  });

  lab.test('it runs unsuccessfully when pg connect fails', (done) => {
    const connect = Db.pg.connect;

    Db.pg.connect = function () {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();

      Db.pg.connect = connect;
      callback(Error('sorry pal'));
    };

    const command = 'SELECT $1::text AS name;';

    Db.run(command, ['pal'], (err, results) => {
      Code.expect(err).to.exist();
      Code.expect(results).to.not.exist();

      done();
    });
  });

  lab.test('it runs a series of commands successfully', (done) => {
    const commands = [
      ['SELECT $1::text AS name;', ['pal']],
      'SELECT COUNT(1) AS count;'
    ];

    Db.runSeries(commands, (err, results) => {
      Code.expect(err).to.not.exist();
      Code.expect(results).to.exist();

      done();
    });
  });

  lab.test('it runs a series unsuccessfully when pg connect fails', (done) => {
    const connect = Db.pg.connect;

    Db.pg.connect = function () {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();

      Db.pg.connect = connect;
      callback(Error('sorry pal'));
    };

    const commands = [
      ['SELECT $1::text AS name;', ['pal']],
      'SELECT COUNT(1) AS count;'
    ];

    Db.runSeries(commands, (err, results) => {
      Code.expect(err).to.exist();
      Code.expect(results).to.not.exist();

      done();
    });
  });
});

lab.experiment('Db run for one', () => {
  lab.test('it runs for one successfully (without return row)', (done) => {
    const command = `
      INSERT INTO users (username, email)
      VALUES ($1, $2)
    `;
    const username = 'pal';
    const email = 'pal@friend';

    Db.runForOne(command, [username, email], (err, record) => {
      Code.expect(err).to.not.exist();
      Code.expect(record).to.not.exist();

      done();
    });
  });

  lab.test('it runs for one successfully (with return row)', (done) => {
    const command = `
      INSERT INTO users (username, email)
      VALUES ($1, $2)
      RETURNING *
    `;
    const username = 'pal2';
    const email = 'pal2@friend';

    Db.runForOne(command, [username, email], (err, record) => {
      Code.expect(err).to.not.exist();
      Code.expect(record).to.exist();

      done();
    });
  });

  lab.test('it runs for one unsuccessfully when run fails', (done) => {
    const run = Db.run;

    Db.run = function () {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();

      Db.run = run;
      callback(Error('sorry pal'));
    };

    const command = `
      INSERT INTO users (username, email)
      VALUES ($1, $2)
      RETURNING *
    `;
    const username = 'pal3';
    const email = 'pal3@friend';

    Db.runForOne(command, [username, email], (err, record) => {
      Code.expect(err).to.exist();
      Code.expect(record).to.not.exist();

      done();
    });
  });
});
