var fs = require('fs')
  , levelup = require('level')
  , path = require('path');

function Store(config) {
    this.config = config || {};
    this.config.local_store_path = this.config.local_store_path || '.';
    this.config.host = this.config.host || 'api.nitrogen.io';
    this.config.http_port = this.config.http_port || 443;

    this.storePath = path.join(config.local_store_path, config.host + "_" + config.http_port);

    this.db = levelup(this.storePath);
}

// NOTE: Only used for test.
Store.prototype.clear = function(callback) {
    var self = this;
    this.db.createKeyStream().on('data', function (key) {
        self.db.del(key);
    });
};

Store.prototype.get = function(key, callback) {
    this.db.get(key, function(err, value) {
        if (err) {
            if (err.notFound)
              return callback(null, null);
            else
              return callback(err);
        }

        return callback(null, JSON.parse(value));
    });
};

Store.prototype.set = function(key, value, callback) {
    this.db.put(key, JSON.stringify(value), callback);
};

Store.prototype.delete = function(key, callback) {
    this.db.del(key, callback);
};

module.exports = Store;