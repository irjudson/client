var request = require('request');

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

    var authBody = { principal_type: "device", id: this.id };
    if (this.isDevice()) {
        authBody.secret = this.secret;
    } else if (this.isUser()) {
        authBody.email = this.email;
        authBody.password = this.password;
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

Principal.prototype.toStoreId = function() {
    if (!this.local_id) console.log("WARNING: local_id is not defined");

    return "principal." + this.local_id;
};

Principal.prototype.isDevice = function() { return this.principal_type == "device"; }
Principal.prototype.isUser   = function() { return this.principal_type == "user";   }

module.exports = Principal;