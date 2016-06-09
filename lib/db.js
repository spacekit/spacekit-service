'use strict';
const CreateLogger = require('./create-logger');
const Pg = require('pg').native;

const log = CreateLogger('Db');

class Db {
  constructor (connectionString) {
    this.connectionString = connectionString; // may be null if unconfigured
  }

  run (query, params, callback) {
    Pg.connect(this.connectionString, (err, client, done) => {
      if (err) {
        return callback(err);
      }

      client.query(query, params, (err, result) => {
        done(); // releases client

        callback(err, result);
      });
    });
  }

  /**
   * Increment a statistic in the database.
   *
   * Every stat is tracked on a daily basis, for graphing and aggregation.
   * This functionality requires PostgreSQL 9.5 or later.
   */
  incrementStat (key, increment) {
    let period = new Date().toISOString().slice(0, 10); // 2016-01-01
    this.run(`
      INSERT INTO stats (period, key, value)
          VALUES ($1, $2, $3)
        ON CONFLICT (period, key)
          DO UPDATE SET value = stats.value + EXCLUDED.value
    `, [period, key, increment], (err, result) => {
      if (err) {
        log.warn('Unable to save stat:', key, increment, err);
      }
    });
  }
}

module.exports = Db;
