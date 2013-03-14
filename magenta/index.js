exports.Blob       = require('./blob');
exports.Device     = require('./device');
exports.FileStore  = require('./fileStore');
exports.HTML5Store = require('./html5Store');
exports.Message    = require('./message');
exports.Service    = require('./service');
exports.Session    = require('./session');
exports.User       = require('./user');

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};