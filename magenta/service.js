var Session = require('./session');

function Service(config) {
	this.config = config;
	this.store = config.store;
};

Service.prototype.connect = function(principal, callback) {
    this.store.load(function(err) {
        if (err) callback(err, null);

        this.register(principal, function(err, principal) {
            if (err) return callback(err, null, null);

            var session = new Session(this, principal);
            callback(null, session, principal);
        }.bind(this));

    }.bind(this));
};

Service.prototype.register = function(principal, callback) {
    var storedPrincipal = this.store.get(principal.toStoreId());

    if (!storedPrincipal) {
        console.log("need to provision principal");
        principal.create(this.config, function(err, principal) {
            if (err) {
                console.log('failed to provision principal: ' + err);
                callback(err, null);
            }

            console.log("principal provisioned: " + JSON.stringify(principal));

            this.store.set(principal.toStoreId(), principal);
            callback(null, principal);
        }.bind(this));
    } else {
        console.log("TODO: need to relogin principal");
        principal.id = storedPrincipal.id;
        callback(null, principal);
    }

};

module.exports = Service;