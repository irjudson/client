var request = require('request')
  , Principal = require('./principal')
  , Session = require('./session');

function Service(config) {
	this.config = config || {};
    this.config.host = this.config.host || 'api.nitrogen.io';
    this.config.protocol = this.config.protocol || 'https';
    this.config.http_port = this.config.http_port || 443;

    this.config.base_url = this.config.protocol + "://" + this.config.host + ":" + this.config.http_port + "/api/v1";
    this.config.headwaiter_endpoint = this.config.base_url + "/headwaiter";

    this.store = config.store;
};

// authenticate principal.  callback on failure.
Service.prototype.authenticate = function(principal, callback) {
    var self = this;
    this.store.load(function(err) {
        if (err) return callback(err);

        self.authenticateSession(principal, principal.authenticate, callback);
    });
};

// create principal.  callback on failure.
Service.prototype.create = function(principal, callback) {
    var self = this;
    this.store.load(function(err) {
        if (err) return callback(err);

        self.authenticateSession(principal, principal.create, callback);
    });
};

// attempt to restart the session with an existing accessToken
Service.prototype.resume = function(principal, callback) {
    var self = this;
    var p = principal;
    self.store.load(function(err) {
        if (err) return callback(err);

        var storedPrincipal = self.store.get(p.toStoreId());

        // if we don't have a stored accessToken, bail out.
        if (!storedPrincipal || !storedPrincipal.accessToken) return callback();

        principal.updateAttributes(storedPrincipal);
        self.authenticateSession(principal, principal.resume, callback);
    });
};

// connect attempts to find existing principal before creating one.
// used for bootstrapping and ongoing authentication of devices.
Service.prototype.connect = function(principal, callback) {
    var self = this;
    var p = principal;

    self.store.load(function(err) {
        if (err) return callback(err);

        var storedPrincipal = self.store.get(p.toStoreId());
        if (!storedPrincipal) {
            self.authenticateSession(p, p.create, callback);
        } else {
            p.updateAttributes(storedPrincipal);
            self.authenticateSession(p, p.authenticate, callback);
        }
    });
};

Service.prototype.authenticateSession = function(principal, authOperation, callback) {
    var self = this;

    this.configure(self.config, principal, function(err, config) {
        if (err) return callback(err);

        self.config = config;
        authOperation.bind(principal)(self.config, function(err, principal, accessToken) {
            if (err) return callback(err);
            if (!principal) return callback("authentication failed");
            if (!accessToken) return callback("authentication failed");

            principal.accessToken = accessToken;

            console.log("saving principal to store: " + JSON.stringify(principal));
            self.store.set(principal.toStoreId(), principal);

            var session = new Session(self, principal, accessToken);
            session.start();
            callback(null, session, principal);
        });
    });
};

Service.prototype.impersonate = function(session, principalId, callback) {
    var self = this;

    Principal.impersonate(session, principalId, function(err, impersonatedPrincipal, accessToken) {
        if (err) return callback(err);

        impersonatedPrincipal.accessToken = accessToken;
        var session = new Session(self, impersonatedPrincipal, accessToken);
        callback(null, session, impersonatedPrincipal);
    });
};

Service.prototype.configure = function(config, principal, callback) {
    var headwaiter_url = config.headwaiter_endpoint;

    if (principal.is('user')) {
        headwaiter_url += "?email=" + principal.email;
    } else if (principal.id) {
        headwaiter_url += "?principal_id=" + principal.id;
    }

    request.get({url: headwaiter_url, json: true}, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(body.error || resp.statusCode);

        for (var key in body.endpoints) {
            config[key] = body.endpoints[key];
        }

        callback(null, config);
    });
};

Service.prototype.clearCredentials = function(principal) {
    this.store.delete(principal.toStoreId());
};

module.exports = Service;
