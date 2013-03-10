var LocalStore = require('./local_store'),
    Session = require('./session');

function Service(config) {
	this.config = config;
	this.store = config.store;
};

Service.initialize = function(config, callback) {
	var service = new Service(config);

	// run any blocking must-do operations before calling back with service
	// to authorize client code to continue.

	// load local store
	service.store.load(function(err) {
		callback(err, service);
	});
};

Service.prototype.connect = function(principal, callback) {
	var session = new Session(this, principal);

	session.register(principal, function(err, principal) {

	});

	callback(null, session);
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