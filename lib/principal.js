var crypto = require('crypto')
  , request = require('request');

/**
 * @class Principal
 * Test
**/

function Principal(json) {
    this.id = null;

    this.updateAttributes(json);
}

/**
 * A Principal in Nitrogen represents entities with authentication privileges in Nitrogen.  Applications, devices,
 * and services are all examples of principals.
 **/

/**
 * @method authenticate
 * @async
 *
 * Authenticate this principal with the service.  The mechanism used to authenticate depends on
 * the type of principal. For users, an email and password is used.  For all other principals,
 * public key auth will be used.
 *
 * @param {Object} config The config for the Nitrogen service to auth against.
 * @param {Function} callback Callback function of the form f(err, principal, accessToken).
 **/

Principal.prototype.authenticate = function(config, callback) {
    var self = this;

    var authBody = { type: this.type, id: this.id };
    var headers = {};

    if (this.is('user')) {
        authBody.email = this.email;
        authBody.password = this.password;
    } else {
        var signer = crypto.createSign("RSA-SHA256");

        signer.update(config.nonce);
        var privateKeyBuf = new Buffer(this.private_key, 'base64');

        headers = {
            nonce: config.nonce,
            signature: signer.sign(privateKeyBuf, "base64")
        };
    }

    var path;
    if (this.is('user')) {
        path = "/user/auth";
    } else {
        path = "/publickey/auth";
    }

    request.post({ url: config.endpoints.principals + path, headers: headers, json: authBody }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(body.error || resp.statusCode);

        self.updateAttributes(body.principal);

        return callback(null, self, body.accessToken);
    });
};

/**
 * Create a new principal with the service.  For user principal types, this principal must have a email, password, and
 * name.
 *
 * @method create
 * @async
 * @param {Object} config The config data for the Nitrogen service.
 * @param {Function} callback Callback function of the form f(err, principal, accessToken).
 **/

Principal.prototype.create = function(config, callback) {
    var self = this;

    if (this.is('user') && (!this.email || !this.password || !this.name)) {
        return callback("Please provide your full name, email, and password to create an account.");
    }

    var principalJson = this.toStoreObject();
    delete principalJson.private_key;

    request.post({ url: config.endpoints.principals, json: principalJson }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(body.error || resp.statusCode);

        self.updateAttributes(body.principal);

        return callback(null, self, body.accessToken);
    });
};

/**
 * Find principals filtered by the passed query and limited to and sorted by the passed options.
 *
 * @method find
 * @param {Object} session An open session with a Nitrogen service.
 * @param {Object} query A query filter for the principals defined using MongoDB's query format.
 * @param {Object} options Options for the query:  'limit': maximum number of results to be returned. 'sort': The field that the results should be sorted on, 'dir': The direction that the results  should be sorted. 'skip': The number of results that should be skipped before pulling results.
 * @param {Function} callback Callback function of the form f(err, principals).
 **/

Principal.find = function(session, query, options, callback) {
    if (!session) return callback(new Error('Principal.findById requires active session.'));

    var principalsUrl = session.service.config.endpoints.principals;
    session.get({
        url: principalsUrl,
        query: query,
        queryOptions: options,
        json: true
    }, function(err, resp, body) {
        if (err) return callback(err);

        var principals = body.principals.map(function(principal) {
            return new Principal(principal);
        });

        callback(null, principals);
    });
};

/**
 * Find a principal by id.
 *
 * @method findById
 * @param {Object} session An open session with a Nitrogen service.
 * @param {String} principalId The principal id to search for.
 * @param {Function} callback Callback function of the form f(err, principal, accessToken).
 **/

Principal.findById = function(session, principalId, callback) {
    if (!session) return callback(new Error('Principal.findById requires active session.'));

    var principalsUrl = session.service.config.endpoints.principals + "/" + principalId;
    session.get({ url: principalsUrl, json: true }, function(err, resp, body) {
        if (err) return callback(err);

        callback(null, new Principal(body.principal));
    });
};

/**
 * Impersonate a principal using another principal's session.  This is used by the service to
 * impersonate a particular principal for application execution.
 *
 * @method impersonate
 * @param {Object} session An open session with a Nitrogen service.
 * @param {String} principalId The principal id to impersonate.
 * @param {Function} callback Callback function of the form f(err, principal, accessToken).
 **/

Principal.impersonate = function(session, principalId, callback) {
    var self = this;
    var impersonateUrl = session.service.config.endpoints.principals + "/impersonate";
    session.post({ url: impersonateUrl, json: { id: principalId } }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(body.error || resp.statusCode);

        var receivedPrincipal = new Principal(body.principal);

        // preserve the nickname for storage
        receivedPrincipal.nickname = self.nickname;

        return callback(null, receivedPrincipal, body.accessToken);
    });
};

/**
 * Delete this principal from the service.
 *
 * @method remove
 * @param {Object} session An open session with a Nitrogen service.
 * @param {Function} callback Callback function of the form f(err).
 **/

Principal.prototype.remove = function(session, callback) {
    var self = this;

    session.remove({ url: session.service.config.endpoints.principals + "/" + this.id }, function(err) {
        if (err) return callback(err);

        session.service.clearCredentials(self);

        return callback();
    });
};

/**
 * Resume a session using a stored accessToken (attached to this principal).
 *
 * @method resume
 * @param {Object} session An open session with a Nitrogen service.
 * @param {Function} callback Callback function of the form f(err, principal, accessToken).
 **/

Principal.prototype.resume = function(config, callback) {
    // We already should have an accessToken so we attempt to use that.
    // If it is expired or revoked our first use of it will send us back to authentication.

    return callback(null, this, this.accessToken);
};

/**
 * Save this principal to the service.
 *
 * @method save
 * @param {Object} session An open session with a Nitrogen service.
 * @param {Function} callback Callback function of the form f(err, principal).
 **/

Principal.prototype.save = function(session, callback) {
    if (!this.id) return callback("Principal must have id to be saved.");
    var self = this;

    session.put({ url: session.service.config.endpoints.principals + "/" + this.id, json: this }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(resp.statusCode, null);

        self.updateAttributes(body.principal);

        if (callback) callback(null, self);
    });
};

/**
 * Report the status of this principal.  Principal subclasses should override this method if there
 * is meaningful status that they can provide.  This status is included in the principal's heartbeat
 * to the Nitrogen service.
 *
 * By default this implementation simply makes a no status callback.
 *
 * @method status
 * @param {Function} callback Callback function of the form f(err, status).
 **/

Principal.prototype.status = function(callback) {
    // nop by default, principal subclasses should override if there is a meaningful status they can provide.
    callback(null, {});
};

Principal.prototype.toStoreId = function() {
    if (!this.nickname) console.log("WARNING: nickname is not defined for device.");

    return "principal." + this.nickname;
};

Principal.prototype.toStoreObject = function() {
    return {
        id: this.id,
        type: this.type,
        email: this.email,
        password: this.password,
        accessToken: this.accessToken,
        public_key: this.public_key,
        private_key: this.private_key
    };
};

Principal.prototype.updateAttributes = function(json) {
    for(var key in json) {
        if(json.hasOwnProperty(key)) {
            this[key] = json[key];
        }
    }
};

/**
 * Change the password for this user principal as part of this session.
 *
 * Only the current principal may change their password.  If the current principal is not a user,
 * the request will fail with a 400 Bad Request.
 *
 * @method changePassword
 * @param {Object} session An open session with a Nitrogen service.
 * @param {String} currentPassword The current password for the user.
 * @param {String} newPassword The new password for the user.
 * @param {Function} callback Callback function with signature f(err).
 **/

Principal.prototype.changePassword = function(session, currentPassword, newPassword, callback) {
    var self = this;
    if (!this.is('user')) return callback('changePassword is only possible for user principals.');

    this.password = currentPassword;
    this.new_password = newPassword;

    session.post({
        url: session.service.config.endpoints.principals + "/password",
        json: this
    }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(resp.statusCode);

        // changing password invalidates this session
        session.stop();

        return callback();
    });
};

/**
 * Reset the password for the user principal with this email address.
 *
 * @method resetPassword
 * @param {Object} config The headwaiter returned config for the Nitrogen service.
 * @param {String} email The email for the user you'd like to reset the password for.
 * @param {Function} callback Callback function with signature f(err, principal).
 **/

Principal.resetPassword = function(config, email, callback) {
    var self = this;

    request.post({
        url: config.endpoints.principals + '/reset/',
        json: { email: email }
    }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(resp.body.error);

        if (callback) callback(null, self);
    });
};

Principal.prototype.is = function(type) {
    return this.type === type;
};

module.exports = Principal;