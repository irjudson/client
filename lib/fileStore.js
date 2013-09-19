var fs = require('fs'),
    path = require('path');

function FileStore(config) {
    this.config = config || {};
    this.config.local_store_path = this.config.local_store_path || '.';
    this.config.host = this.config.host || 'api.nitrogen.io';
    this.config.http_port = this.config.http_port || 443;

      this.storePath = path.join(config.local_store_path, config.host + "_" + config.http_port + ".store");
}

FileStore.prototype.clear = function(callback) {
    this.props = {};
    this.save(callback);
};

FileStore.prototype.load = function(callback) {
  var self = this;

  // if already loaded, callback immediately.
  if (self.props) return callback();

  fs.exists(self.storePath, function(exists) {
      if (exists) {
          fs.readFile(self.storePath, function (err, json) {
              if (err) return callback(err);

              self.props = JSON.parse(json);
              return callback();
          });
      } else {
          console.log("warning: couldn't find current store, creating new one.");

          self.props = {};
          self.save(callback);
      }
  });
};

FileStore.prototype.get = function(key) {
    if (key in this.props) {
        return this.props[key];
    } else {
        return null;
    }
};

FileStore.prototype.set = function(key, value, callback) {
    this.props[key] = value;
    this.save(callback);
};

FileStore.prototype.delete = function(key, value) {
    delete this.props[key];
    this.save();
};

FileStore.prototype.save = function(callback) {
    var self=this;

  fs.writeFile(self.storePath, JSON.stringify(self.props), function (err) {
      if (err) console.log('error saving store to ' + self.storePath + ": " + err);

      if (callback) callback(err);
  });
};

module.exports = FileStore;
