// Global init
global.Promise = require('babel-runtime/core-js/promise').default = require('bluebird');
require('source-map-support').install();

// Exports
module.exports = require('./dist/index').default; // eslint-disable-line import/no-unresolved
