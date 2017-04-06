'use strict';
const Code = require('code');
const Lab = require('lab');
const Config = require('../../lib/config');

const lab = exports.lab = Lab.script();

lab.experiment('Config', () => {
  lab.test('it gets config data', (done) => {
    Code.expect(Config.get('/')).to.be.an.object();

    done();
  });
});
