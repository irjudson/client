var EventLog = require('./event_log'),
	faye = require('faye');

function Session(service, principal) {
	this.service = service;
	this.principal = principal;

	this.fayeClient = new faye.Client(service.config.realtime_url);
	this.log = new EventLog(this);
}

Session.prototype.register = function(principal, callback) {
    var storedPrincipal = this.service.store.get(principal.toStoreId());

    if (!storedPrincipal) {
        console.log("need to provision principal");
        principal.create(this, function(err, p) {
            if (err) {
                console.log('failed to provision principal: ' + p.local_id);
                callback(err, null);
            }

            console.log("device provisioned: " + JSON.stringify(p));

            this.service.store.set(p.toStoreId(), p);
            callback(null, p);
        }.bind(this));
    } else {
        console.log("TODO: need to login principal");
        principal.id = storedPrincipal.id;
    }

    callback(null, principal);
};

Session.prototype.subscribe = function(principal, callback) {
	this.fayeClient.subscribe('/principal/' + principal.id, callback);
};

module.exports = Session;