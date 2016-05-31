'use strict';
const Pg = require('pg').native;

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
}

module.exports = Db;
