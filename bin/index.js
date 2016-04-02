#!/usr/bin/env node
'use strict';
const Config = require('../lib/config');
const SpaceKitService = require('../lib');

module.exports = new SpaceKitService(Config);
