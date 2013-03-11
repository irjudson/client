var Session = require('./session');

function Service(config) {
	this.config = config;
	this.store = config.store;
};

Service.prototype.connect = function(principal, callback) {
    this.store.load(function(err) {
        if (err) callback(err, null);

        var session = new Session(this, principal);

        session.register(principal, function(err, principal) {

        });

        callback(null, session);
    }.bind(this));
};

Service.prototype.register = function(principal, callback) {
	// look to see if we have a magenta id for this device
	// if we don't, we need to provision the device against the service.
		// POST /principals
		// which returns the magenta id

	// look to see if we have a valid auth token for this device.
	// if we don't, we need to authenticate the device into the service.
		//

	callback(null, principal);
};

module.exports = Service;