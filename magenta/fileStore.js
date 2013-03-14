var fs = require('fs'),
    path = require('path');

function FileStore(config) {
  this.storePath = path.join(config.local_store_path, config.host + "_" + config.http_port + ".store");
}

FileStore.prototype.clear = function(callback) {
    this.props = {};
    this.save(callback);
};

FileStore.prototype.load = function(callback) {

  // if already loaded, callback immediately.
  if (this.props) return callback(null);

  fs.exists(this.storePath, function(exists) {
      if (exists) {
          fs.readFile(this.storePath, function (err, json) {
              if (err) {
                  return callback(err);
              } else {
                  this.props = JSON.parse(json);
                  return callback(null);
              }
          }.bind(this));
      } else {
          console.log("warning: couldn't find current store, creating new one.");

          this.props = {};
          this.save(callback);
      }
  }.bind(this));
}

FileStore.prototype.get = function(key) {
    if (key in this.props) {
        return this.props[key];
    } else {
        return null;
    }
}

FileStore.prototype.set = function(key, value, callback) {
  this.props[key] = value;
  this.save(callback);
}

FileStore.prototype.save = function(callback) {
	fs.writeFile(this.storePath, JSON.stringify(this.props), function (err) {
      if (err) console.log('error saving store to ' + this.storePath + ": " + err);

      if (callback) callback(err);
 	}.bind(this));
};

module.exports = FileStore;