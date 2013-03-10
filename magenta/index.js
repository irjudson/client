exports.Blob       = require('./blob');
exports.Device     = require('./device');
exports.LocalStore = require('./local_store');
exports.Message    = require('./message');
exports.Service    = require('./service');
exports.Session    = require('./session');

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};