var request = require('request');

/**
 * A Principal in Nitrogen represents entities with authentication privileges in Nitrogen.  Applications, devices,
 * and services are all examples of principals.
 *
 * @class Principal
 * @namespace nitrogen
 */

function Principal(json) {
    this.id = null;

    this.updateAttributes(json);
}

/**
 * Authenticate this principal with the service.  The mechanism used to authenticate depends on the type of principal.
 * For users, an email and password is used, otherwise the secret generated during creation is used.
 *
 * @method authenticate
 * @async
 * @param {Object} config The config data for the Nitrogen service.
 * @param {Object} callback Callback for the authentication.
 *   @param {Object} callback.err If the authentication failed, this will contain the error.
 *   @param {Object} callback.principal This principal.
 *   @param {Object} callback.accessToken The current access token to use with the Nitrogen service for this principal.
 **/

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
 * @param {Object} callback Callback for the creation.
 *   @param {Object} callback.err If the creation failed, this will contain the error.
 *   @param {Object} callback.principal This principal.
 *   @param {Object} callback.accessToken The current access token to use with the Nitrogen service for this principal.
 **/

Principal.prototype.create = function(config, callback) {
    var self = this;

    if (this.is('user') && (!this.email || !this.password || !this.name)) {
        return callback("Please provide your full name, email, and password to create an account.");
    }

    request.post({ url: config.principals_endpoint, json: self }, function(err, resp, body) {
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
 * @async
 * @param {Object} session An open session with a Nitrogen service.
 * @param {Object} query A query filter for the principals defined using MongoDB query format.
 * @param {Object} options Options for the query.
 *   @param {Number} options.limit The maximum number of principals to be returned.
 *   @param {String} options.sort The field that the results should be sorted on.
 *   @param {Number} options.dir The direction that the results should be sorted.
 *   @param {Object} options.skip The number of results that should be skipped before pulling results.
 * @param {Object} callback Callback at completion of execution.
 *   @param {Object} callback.err If the find failed, find will callback with the error.
 *   @param {Array} callback.principals The set of principals found with this query.
 **/

Principal.find = function(session, query, options, callback) {
    if (!session) return callback(new Error('Principal.findById requires active session.'));

    var principalsUrl = session.service.config.principals_endpoint;
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
 * @async
 * @param {Object} session An open session with a Nitrogen service.
 * @param {String} principalId The principal id to search for.
 * @param {Object} callback Callback at completion of execution.
 *   @param {Object} callback.err If the find failed, find will callback with the error.
 *   @param {Array} callback.principal The principal found with this query or null if none found.
 **/

Principal.findById = function(session, principalId, callback) {
    if (!session) return callback(new Error('Principal.findById requires active session.'));

    var principalsUrl = session.service.config.principals_endpoint + "/" + principalId;
    session.get({ url: principalsUrl, json: true }, function(err, resp, body) {
        if (err) return callback(err);

        callback(null, new Principal(body.principal));
    });
};

/**
 * Impersonate a principal using another principal's session.  This is used primarily by the service to impersonate
 * a particular principal for agent execution.
 *
 * @method impersonate
 * @async
 * @param {Object} session An open session with a Nitrogen service.
 * @param {String} principalId The principal id to impersonate.
 * @param {Object} callback Callback for the creation.
 *   @param {Object} callback.err If the creation failed, this will contain the error.
 *   @param {Object} callback.principal This principal.
 *   @param {Object} callback.accessToken The current access token to use with the Nitrogen service for this principal.
 **/

Principal.impersonate = function(session, principalId, callback) {
    var self = this;
    var impersonateUrl = session.service.config.principals_endpoint + "/impersonate";
    session.post({ url: impersonateUrl, json: { id: principalId } }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(body.error || resp.statusCode);

        var receivedPrincipal = new Principal(body.principal);

        // preserve the nickname and secret for storage (if any)
        receivedPrincipal.secret = self.secret;
        receivedPrincipal.nickname = self.nickname;

        return callback(null, receivedPrincipal, body.accessToken);
    });
};

/**
 * Delete this principal from the service.
 *
 * @method remove
 * @async
 * @param {Object} session An open session with a Nitrogen service.
 * @param {Object} callback Callback for the creation.
 *   @param {Object} callback.err If the creation failed, this will contain the error.
 **/

Principal.prototype.remove = function(session, callback) {
    var self = this;

    session.remove({ url: session.service.config.principals_endpoint + "/" + this.id }, function(err) {
        if (err) return callback(err);

        session.service.clearCredentials(self);

        return callback();
    });
};

/**
 * Resume a session using a stored accessToken from the service.
 *
 * @method resume
 * @async
 * @param {Object} session An open session with a Nitrogen service.
 * @param {Object} callback Callback for the save.
 *   @param {Object} callback.err If the save failed, this will contain the error.
 *   @param {Object} callback.principal The saved principal returned by the service.
 *   @param {Object} callback.accessToken The accessToken used to resume the session with the service.
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
 * @async
 * @param {Object} session An open session with a Nitrogen service.
 * @param {Object} callback Callback for the save.
 *   @param {Object} callback.err If the save failed, this will contain the error.
 *   @param {Object} callback.principal The saved principal returned by the service.
 **/

Principal.prototype.save = function(session, callback) {
    if (!this.id) return callback("Principal must have id to be saved.");
    var self = this;

    session.put({ url: session.service.config.principals_endpoint + "/" + this.id, json: this }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(resp.statusCode, null);

        self.updateAttributes(body.principal);

        if (callback) callback(null, self);
    });
};

/**
 * Report the status of this principal.  Principal subclasses should override this method if there is meaningful
 * status that they can provide.  This status is included in the principal's heartbeat to the Nitrogen service.
 *
 * @method status
 * @async
 * @param {Object} callback Callback for the save.
 *   @param {Object} callback.err If the status request to the principal failed, this will contain the error.
 *   @param {Object} callback.status The status of the principal.
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
        accessToken: this.accessToken,
        secret: this.secret
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
 * Only the current principal may change their password.  If the current principal is not a device, the request will fail with a 
 * 400 Bad Request.  
 *
 * @method changePassword
 * @async
 * @param {Object} session An open session with a Nitrogen service.
 * @param {String} currentPassword The current password for the user.
 * @param {String} newPassword The new password for the user.
 * @param {Object} callback Callback for the save.
 *   @param {Object} callback.err If the save failed, this will contain the error.
 *   @param {Object} callback.principal The saved principal returned by the service.
 **/

Principal.prototype.changePassword = function(session, currentPassword, newPassword, callback) {
    var self = this;
    if (!this.is('user')) return callback('changePassword is only possible for user principals.');

    this.password = currentPassword;
    this.new_password = newPassword;

    session.post({
        url: session.service.config.principals_endpoint + "/password", 
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
 * @async
 * @param {Object} config The headwaiter returned config for the Nitrogen service.
 * @param {String} email The email for the user you'd like to reset the password for.
 * @param {Object} callback Callback for the save.
 *   @param {Object} callback.err If the save failed, this will contain the error.
 *   @param {Object} callback.principal The principal whose password was reset.
 **/

Principal.resetPassword = function(config, email, callback) {
    var self = this;

    request.post({
        url: config.principals_endpoint + "/reset/" + email
    }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(resp.statusCode);

        if (callback) callback(null, self);
    });
};

Principal.prototype.is = function(type) { 
    return this.type === type; 
};

module.exports = Principal;