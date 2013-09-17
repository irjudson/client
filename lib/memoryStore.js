function MemoryStore(config) {
    this.props = {};
}

MemoryStore.prototype.clear = function(callback) {
    this.props = {};
};

MemoryStore.prototype.load = function(callback) {
    callback(null);
};

MemoryStore.prototype.get = function(key) {
    if (key in this.props) {
        return this.props[key];
    } else {
        return null;
    }
};

MemoryStore.prototype.set = function(key, value, callback) {
  this.props[key] = value;
};

MemoryStore.prototype.delete = function(key, value) {
    delete this.props[key];
};

module.exports = MemoryStore;