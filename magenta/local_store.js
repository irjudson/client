var fs = require('fs'),
    path = require('path');

function LocalStore(config) {
  this.storePath = path.join(config.local_store_path, config.host + "_" + config.http_port + ".store");
}

LocalStore.prototype.load = function(callback) {

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
          return callback(null);
      }
  }.bind(this));
}

LocalStore.prototype.get = function(key) {
    if (key in this.props) {
        return this.props[key];
    } else {
        return null;
    }
}

LocalStore.prototype.set = function(key, value) {
  this.props[key] = value;
  this.save();
}

LocalStore.prototype.save = function() {
	fs.writeFile(this.storePath, JSON.stringify(this.props), function (err) {
      if (err) console.log('error saving store to ' + this.storePath + ": " + err);
 	}.bind(this));
};

module.exports = LocalStore;