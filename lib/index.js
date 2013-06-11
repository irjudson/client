exports.Agent            = require('./agent');
exports.Blob             = require('./blob');
exports.CameraManager    = require('./cameraManager');
exports.CommandManager   = require('./commandManager');
exports.Device           = require('./device');
exports.FileStore        = require('./fileStore');
exports.HTML5Store       = require('./html5Store');
exports.MemoryStore      = require('./memoryStore');
exports.Message          = require('./message');
exports.Principal        = require('./principal');
exports.Service          = require('./service');
exports.Session          = require('./session');
exports.User             = require('./user');

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};
