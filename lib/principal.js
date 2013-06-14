var AuthRequest = require('./authRequest')
  , request = require('request');

function Principal(json) {
    this.id = null;

    this.updateAttributes(json);
}

Principal.prototype.authenticate = function(config, callback) {
    var self = this;

    var authBody = { type: this.type, id: this.id };
    if (this.is('user')) {
        authBody.email = this.email;
        authBody.password = this.password;
    } else {
        authBody.secret = this.secret;
    }

    request.post({ url: config.principals_endpoint + "/auth", json: authBody }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(body.error || resp.statusCode);

        var receivedPrincipal = new Principal(body.principal);

        // preserve the local nickname and secret for storage
        receivedPrincipal.secret = self.secret;
        receivedPrincipal.nickname = self.nickname;

        return callback(null, receivedPrincipal, body.accessToken);
    });
};

Principal.prototype.create = function(config, callback) {
    var self = this;

    if (this.is('user') && (!this.email || !this.password || !this.name)) {
        return callback("Please provide your full name, email, and password to create an account.");
    }

    request.post({ url: config.principals_endpoint, json: self }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(body.error || resp.statusCode);

        var p = new Principal(body.principal);

        // preserve nickname for storage
        p.nickname = self.nickname;

        return callback(null, p, body.accessToken);
    });
};

Principal.find = function(session, query, callback) {
    var principalsUrl = session.service.config.principals_endpoint;
    AuthRequest.get(session, { url: principalsUrl, query: query, json: true }, function(err, resp, body) {
        if (err) return callback(err);

        var principals = body.principals.map(function(principal) {
            var p = new Principal(principal);
            return p;
        });

        callback(null, principals);
    });
};

Principal.findById = function(session, id, callback) {
    var principalsUrl = session.service.config.principals_endpoint + "/" + id;
    AuthRequest.get(session, { url: principalsUrl, json: true }, function(err, resp, body) {
        if (err) return callback(err);

        callback(null, new Principal(body.principal));
    });
};

Principal.impersonate = function(session, principalId, callback) {
    var self = this;
    var impersonateUrl = session.service.config.principals_endpoint + "/impersonate";
    AuthRequest.post(session, { url: impersonateUrl, json: { id: principalId } }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(body.error || resp.statusCode);

        var receivedPrincipal = new Principal(body.principal);

        // preserve the nickname and secret for storage (if any)
        receivedPrincipal.secret = self.secret;
        receivedPrincipal.nickname = self.nickname;

        return callback(null, receivedPrincipal, body.accessToken);
    });
};

Principal.prototype.resume = function(config, callback) {
    // We already should have an accessToken so we attempt to use that.
    // If it is expired or revoked our first use of it will send us back to authentication.

    return callback(null, this, this.accessToken);
};

Principal.prototype.save = function(session, callback) {
    if (!this.id) return callback("Principal must have id to be saved.");

    AuthRequest.put(session, { url: session.service.config.principals_endpoint + "/" + this.id, json: this }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(resp.statusCode, null);

        if (callback) callback(null, new Principal(body.principal));
    });
};

Principal.prototype.toStoreId = function() {
    if (!this.nickname) console.log("WARNING: nickname is not defined");

    return "principal." + this.nickname;
};

Principal.prototype.update = function(session, callback) {
    var self = this;
    var updateUrl = session.service.config.principals_endpoint + "/" + this.id;

    AuthRequest.put(session, { url: updateUrl, json: this }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(resp.statusCode);

        self.updateAttributes(body.principal);

        return callback(null, self);
    });
};

Principal.prototype.updateAttributes = function(json) {
    for(var key in json) {
        if(json.hasOwnProperty(key)) {
            this[key] = json[key];
        }
    }
};

Principal.prototype.is = function(type) { return this.type === type; }

module.exports = Principal;