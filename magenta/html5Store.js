function HTML5Store(config) {
  this.storePath = config.host + "_" + config.http_port + ".store";
}

HTML5Store.prototype.load = function(callback) {
  // if already loaded, callback immediately.
  if (this.props) {
      return callback(null);
  }

  var propsJson = localStorage.getItem(this.storePath);

  if (!propsJson) {
      this.props = {};
      this.save();
  } else {
      this.props = JSON.parse(propsJson);
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
    localStorage.setItem(this.storePath, JSON.stringify(this.props));
};

module.exports = HTML5Store;