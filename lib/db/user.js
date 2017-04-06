'use strict';
const Db = require('./index');

class User {
  static create (username, email, callback) {
    const query = `
      INSERT INTO users (username, email)
      VALUES ($1, $2)
      RETURNING *
    `;
    const params = [username, email];

    Db.runForOne(query, params, callback);
  }

  static findOneByUsername (username, callback) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const params = [username];

    Db.runForOne(query, params, callback);
  }

  static findOneByEmail (email, callback) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const params = [email];

    Db.runForOne(query, params, callback);
  }

  static findOneByCredentials (username, email, callback) {
    const query = `
      SELECT * FROM users
      WHERE username = $1 AND email = $2
    `;
    const params = [username, email];

    Db.runForOne(query, params, callback);
  }

  static setChallenge (id, challenge, expires, callback) {
    const query = `
      UPDATE users
      SET challenge = $2, challenge_expires = $3
      WHERE id = $1
      RETURNING *
    `;
    const params = [id, challenge, expires];

    Db.runForOne(query, params, callback);
  }
}

User.scaffold = {
  setup: `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      challenge TEXT,
      challenge_expires TIMESTAMP WITHOUT TIME ZONE,
      created TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
    )
  `,
  clear: 'DELETE FROM users',
  tearDown: 'DROP TABLE IF EXISTS users'
};

module.exports = User;
