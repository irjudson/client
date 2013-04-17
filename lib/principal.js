var AuthRequest = require('./authRequest')
  , request = require('request');

function Principal(json) {
    this.id = null;

    for(var key in json) {
        if(json.hasOwnProperty(key)) {
            this[key] = json[key];
        }
    }
}

Principal.prototype.authenticate = function(config, callback) {
    var self = this;

    var authBody = { principal_type: this.principal_type, id: this.id };
    if (this.isUser()) {
        authBody.email = this.email;
        authBody.password = this.password;
    } else {
        authBody.secret = this.secret;
    }

    request.post({ url: config.principals_endpoint + "/auth", json: authBody }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(resp.statusCode);

        var receivedPrincipal = new Principal(body.principal);

        // preserve the local_id and secret for storage
        receivedPrincipal.secret = self.secret;
        receivedPrincipal.local_id = self.local_id;

        return callback(null, receivedPrincipal, body.accessToken);
    });
};

Principal.prototype.impersonate = function(session, callback) {
    var self = this;
    var impersonateUrl = session.service.config.principals_endpoint + "/impersonate";
    AuthRequest.post(session, { url: impersonateUrl, json: this }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(resp.statusCode);

        var receivedPrincipal = new Principal(body.principal);

        // preserve the local_id and secret for storage (if any)
        receivedPrincipal.secret = self.secret;
        receivedPrincipal.local_id = self.local_id;

        return callback(null, receivedPrincipal, body.accessToken);
    });
};

Principal.prototype.resume = function(config, callback) {
    // We already should have an accessToken so we attempt to use that.
    // If it is expired or revoked our first use of it will send us back to authentication.

    return callback(null, this, this.accessToken);
};

Principal.prototype.create = function(config, callback) {
    var self=this;

    if (this.isUser() && (!this.email || !this.password)) return callback(400);

	request.post({ url: config.principals_endpoint, json: self }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(resp.statusCode);

        var p = new Principal(body.principal);

        // preserve local_id for storage
        p.local_id = self.local_id;

        return callback(null, p, body.accessToken);
    });
};

Principal.find = function(session, query, callback) {
    var principalsUrl = session.service.config.principals_endpoint;
    AuthRequest.get(session, { url: principalsUrl, qs: query, json: true }, function(err, resp, body) {
        if (err) return callback(err);

        var principals = body.principals.map(function(principal) {
            return new Principal(principal);
        });

        callback(null, principals);
    });
};

Principal.prototype.toStoreId = function() {
    if (!this.local_id) console.log("WARNING: local_id is not defined");

    return "principal." + this.local_id;
};

Principal.prototype.isDevice = function() { return this.principal_type == "device"; }
Principal.prototype.isUser   = function() { return this.principal_type == "user";   }

module.exports = Principal;