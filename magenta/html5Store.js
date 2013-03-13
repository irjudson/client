var fs = require('fs'),
    path = require('path');

function HTML5Store(config) {
  this.storePath = path.join(config.local_store_path, config.host + "_" + config.http_port + ".store");
}

HTML5Store.prototype.load = function(callback) {
  // if already loaded, callback immediately.
  if (this.props) {
      return callback(null);
  }

  this.props = localStorage.getItem(this.storePath);

  if (!this.props) {
      this.props = {};
      this.save();
  }

  callback(null);
}

HTML5Store.prototype.get = function(key) {
    if (key in this.props) {
        return this.props[key];
    } else {
        return null;
    }
}

HTML5Store.prototype.set = function(key, value) {
  this.props[key] = value;
  this.save();
}

HTML5Store.prototype.save = function() {
    localStorage.setItem(this.storePath, this.props);
};

module.exports = HTML5Store;