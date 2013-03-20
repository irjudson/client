var Session = require('./session');

function Service(config) {
	this.config = config;
	this.store = config.store;
};

Service.prototype.connect = function(principal, callback) {
    var self=this;
    self.store.load(function(err) {
        if (err) callback(err, null);

        self.register(principal, function(err, principal) {
            if (err) return callback(err, null, null);

            var session = new Session(self, principal);
            callback(null, session, principal);
        });

    });
};

Service.prototype.register = function(principal, callback) {
    var storedPrincipal = this.store.get(principal.toStoreId());
    var self=this;
    if (!storedPrincipal) {
        console.log("need to provision principal");
        principal.create(self.config, function(err, principal) {
            if (err) {
                console.log('failed to provision principal: ' + err);
                callback(err, null);
            }

            console.log("principal provisioned: " + JSON.stringify(principal));

            self.store.set(principal.toStoreId(), principal);
            callback(null, principal);
        });
    } else {
        console.log("TODO: need to relogin principal");
        principal.id = storedPrincipal.id;
        callback(null, principal);
    }

};

module.exports = Service;