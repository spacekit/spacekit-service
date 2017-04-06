'use strict';
const Db = require('./index');
const Session = require('./session');
const Stat = require('./stat');
const User = require('./user');

class Scaffold {
  static setup (callback) {
    // order matters here;
    // missing relations will cause failure
    const commands = [
      User.scaffold.setup,
      Session.scaffold.setup,
      Stat.scaffold.setup
    ];

    Array.prototype.push.apply(commands, Stat.scaffold.constraints);

    this.tearDown((err, results) => {
      if (err) {
        return callback(err);
      }

      Db.runSeries(commands, callback);
    });
  }

  static clear (callback) {
    const commands = [
      Session.scaffold.clear,
      Stat.scaffold.clear,
      User.scaffold.clear
    ];

    Db.runSeries(commands, callback);
  }

  static tearDown (callback) {
    const commands = [
      Session.scaffold.tearDown,
      Stat.scaffold.tearDown,
      User.scaffold.tearDown
    ];

    Db.runSeries(commands, callback);
  }
}

module.exports = Scaffold;
