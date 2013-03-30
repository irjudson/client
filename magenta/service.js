var request = require('request')
  , Session = require('./session');

function Service(config) {
	this.config = config;
	this.store = config.store;
};

Service.prototype.connect = function(principal, callback) {
    var self=this;

    self.store.load(function(err) {
        if (err) return callback(err, null);

        self.register(principal, function(err, principal) {
            if (err) return callback(err, null, null);

            var session = new Session(self, principal);
            callback(null, session, principal);
        });

    });
};

Service.prototype.configure = function(config, principal, callback) {
    var headwaiter_url = config.headwaiter_endpoint;
    if (principal) {
        headwaiter_url += "?principal_id=" + principal.id;
    }

    request.get({url: headwaiter_url, json: true}, function(err, resp, body) {
        if (err) return callback(err, null);
        if (resp.statusCode != 200) return callback("messages saveMany http response: " + resp.statusCode, null);

        for (var key in body.endpoints) {
            config[key] = body.endpoints[key];
        }

        callback(null, config);
    });
};

Service.prototype.register = function(principal, callback) {
    var storedPrincipal = this.store.get(principal.toStoreId());
    var self=this;

    this.configure(self.config, storedPrincipal, function(err, config) {
        if (err) return callback(err);

        self.config = config;

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
    });

};

module.exports = Service;