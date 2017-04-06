'use strict';
const Db = require('./index');

class Stat {
  /**
   * Increment a statistic in the database.
   *
   * Every stat is tracked on a daily basis, for graphing and aggregation.
   * This functionality requires PostgreSQL 9.5 or later.
   */
  static increment (key, increment, callback) {
    const query = `
      INSERT INTO stats (period, key, value)
        VALUES ($1, $2, $3)
      ON CONFLICT (period, key)
        DO UPDATE SET value = stats.value + EXCLUDED.value
    `;
    const period = new Date().toISOString().slice(0, 10); // 2016-01-01
    const params = [period, key, increment];

    Db.run(query, params, callback);
  }
}

Stat.scaffold = {
  setup: `
    CREATE TABLE IF NOT EXISTS stats (
      period DATE,
      key TEXT,
      value BIGINT DEFAULT 0
    )
  `,
  clear: 'DELETE FROM stats',
  tearDown: 'DROP TABLE IF EXISTS stats',
  constraints: [
    'ALTER TABLE stats ADD UNIQUE (period, key)'
  ]
};

module.exports = Stat;
