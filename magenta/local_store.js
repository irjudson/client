var fs = require('fs'),
    path = require('path');

function LocalStore(config) {
  this.store_path = path.join(config.local_store_path, config.host + "_" + config.http_port + ".store");

  this.properties = {};
}

LocalStore.prototype.load = function(callback) {

  fs.exists(this.store_path, function(exists) {
      if (exists) {
          fs.readFile(this.store_path, function (err, json) {
              if (err) {
                  callback("couldn't load current store: " + err);
              } else {
                  this.properties = JSON.parse(json);
                  callback(null);
              }
          }.bind(this));
      } else {
          console.log("warning: couldn't find current store, creating new one.");

          this.properties = {};
          callback(null);
      }
  }.bind(this));
}

LocalStore.prototype.get = function(property) {
  return this.properties[property];
}

LocalStore.prototype.set = function(property, value) {
  this.properties[property] = value;
  this.save();
}

LocalStore.prototype.save = function() {
	fs.writeFile(this.store_path, JSON.stringify(this.properties), function (err) {
      if (err) console.log('error saving store to ' + this.store_path + ": " + err);
 	}.bind(this));
};

module.exports = LocalStore;