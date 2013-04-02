var request = require('request')
  , Principal = require('./principal')
  , Session = require('./session');

function Service(config) {
	this.config = config;
	this.store = config.store;
};

Service.prototype.connect = function(principal, callback) {
    var self=this;

    self.store.load(function(err) {
        if (err) return callback(err, null);

        self.register(principal, function(err, registeredPrincipal, accessToken) {
            if (err) return callback(err, null, null);

            self.store.set(principal.toStoreId(), registeredPrincipal);

            var session = new Session(self, registeredPrincipal, accessToken);
            callback(null, session, registeredPrincipal);
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
        if (resp.statusCode != 200) return callback(resp.statusCode, null);

        for (var key in body.endpoints) {
            config[key] = body.endpoints[key];
        }

        callback(null, config);
    });
};

Service.prototype.register = function(principal, callback) {
    var self=this;
    var storedPrincipal = this.store.get(principal.toStoreId());

    this.configure(self.config, storedPrincipal, function(err, config) {
        if (err) return callback(err);

        self.config = config;

        if (!storedPrincipal) {
            principal.create(self.config, callback);
        } else {
            new Principal(storedPrincipal).authenticate(self.config, callback);
        }
    });

};

module.exports = Service;