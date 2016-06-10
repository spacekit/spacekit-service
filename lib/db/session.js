'use strict';
const Async = require('async');
const Db = require('./index');
const Secret = require('../secret');

class Session {
  static create (userId, authKey, callback) {
    const query = `
      INSERT INTO sessions (user_id, auth_key)
      VALUES ($1, $2)
      RETURNING *
    `;
    const params = [userId, authKey];

    Db.runForOne(query, params, callback);
  }

  static authenticate (username, authKey, callback) {
    const query = `
      SELECT sessions.auth_key
      FROM sessions
      LEFT JOIN users ON sessions.user_id = users.id
      WHERE users.username = $1
    `;
    const params = [username];

    Db.run(query, params, (err, result) => {
      if (err) {
        return callback(err);
      }

      const iteratee = function (row, done) {
        Secret.compare(authKey, row.auth_key, done);
      };

      Async.some(result.rows, iteratee, callback);
    });
  }
}

Session.scaffold = {
  setup: `
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users ON DELETE CASCADE,
      auth_key TEXT,
      created TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
    )
  `,
  clear: 'DELETE FROM sessions',
  tearDown: 'DROP TABLE IF EXISTS sessions'
};

module.exports = Session;
