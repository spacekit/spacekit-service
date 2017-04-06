'use strict';
const Async = require('async');
const Config = require('../config');
const Pg = require('pg').native;

const pgUri = Config.get('/postgres/uri');

class Db {
  static runForOne (command, params, callback) {
    this.run(command, params, (err, results) => {
      if (err) {
        return callback(err);
      }

      if (results.rows.length === 0) {
        return callback();
      }

      callback(null, results.rows[0]);
    });
  }

  static run (command, params, callback) {
    this.pg.connect(pgUri, (err, client, done) => {
      if (err) {
        return callback(err);
      }

      client.query(command, params, (err, result) => {
        done(); // releases client

        callback(err, result);
      });
    });
  }

  static runSeries (commands, callback) {
    this.pg.connect(pgUri, (err, client, done) => {
      if (err) {
        return callback(err);
      }

      const queries = commands.map((command) => {
        return function (cb) {
          const cmd = typeof command === 'string' ? command : command[0];
          const params = typeof command === 'string' ? [] : command[1];
          client.query(cmd, params, cb);
        };
      });

      Async.series(queries, (err, results) => {
        done(); // releases client

        callback(err, results);
      });
    });
  }
}

Db.pg = Pg;

module.exports = Db;
