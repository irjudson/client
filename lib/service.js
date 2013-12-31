var request = require('request')
  , io = require('socket.io-client')
  , Principal = require('./principal')
  , Session = require('./session')
  , Store = require('./store');

/**
 * A Service is a Nitrogen endpoint that a Session is established against for interactions with it.  How that Session is established depends on the Principal type. 
 * For device and service principals, authentication is done based on a shared secret between the device and the service.  For user principals, authentication
 * is via email and password. Sessions can also be resumed if the principal has stored an authToken. The Service object is also responsible for querying the headwaiter
 * endpoint to fetch the service endpoints that this Session should use.
 *
 * @class Service
 * @namespace nitrogen
 */

function Service(config) {
	this.config = config || {};
    this.config.host = this.config.host || 'api.nitrogen.io';
    this.config.protocol = this.config.protocol || 'https';
    this.config.http_port = this.config.http_port || 443;

    this.config.base_url = this.config.protocol + "://" + this.config.host + ":" + this.config.http_port + "/api/v1";
    this.config.headwaiter_endpoint = this.config.base_url + "/headwaiter";

    this.sockets = {};
    this.sessions = [];
    this.store = config.store;
}

/**
 * Authenticate this principal with the Nitrogen service.  The mechanism used to authenticate depends on the type of principal.
 * For users, an email and password is used, otherwise the secret generated during creation is used.
 *
 * @method authenticate
 * @async
 * @param {Object} principal The principal to authenticate with this service. The principal should include the email/password for a user principal or the secret for other principal types.
 * @param {Object} callback Callback for the authentication.
 *   @param {Object} callback.err If the authenication of this principal failed, this will contain the error.
 *   @param {Object} callback.session The session for this principal with this service.
 *   @param {Object} callback.principal The authenticated principal.
 **/

Service.prototype.authenticate = function(principal, callback) {
    this.authenticateSession(principal, principal.authenticate, callback);
};

/**
 * Create the principal with this service.
 *
 * @method create
 * @async
 * @param {Object} principal The principal to create with this service. It should include email/password for user principal types.
 * @param {Object} callback Callback for the create.
 *   @param {Object} callback.err If the creation of this principal failed, this will contain the error.
 *   @param {Object} callback.session The session for this principal with this service.
 *   @param {Object} callback.principal The created principal.
 **/

Service.prototype.create = function(principal, callback) {
    this.authenticateSession(principal, principal.create, callback);
};

/**
 * Attempts to resume a session for this principal using a saved accessToken.
 *
 * @method resume
 * @async
 * @param {Object} principal The principal to resume the session with this service.
 * @param {Object} callback Callback for the resume.
 *   @param {Object} callback.err If the resumption of this session failed, this will contain the error.
 *   @param {Object} callback.session The session for this principal with this service.
 *   @param {Object} callback.principal The principal used to resume the session.
 **/

Service.prototype.resume = function(principal, callback) {
    var self = this;

    this.store.get(principal.toStoreId(), function(err, storedPrincipal) {
        // if we don't have a stored accessToken, bail out.
        if (!storedPrincipal || !storedPrincipal.accessToken) return callback();

        principal.updateAttributes(storedPrincipal);
        self.authenticateSession(principal, principal.resume, function(err, session, user) {
            Principal.findById(session, user.id, function(err, loadedUser) {
                return callback(err, session, loadedUser);          
            });
        });
    });
};

/**
 * Connect attempts to authenicate the principal with the service. If the principal
 * isn't provisioned with the service, it automatically creates the principal with the 
 * service.
 *
 * @method connect
 * @async
 * @param {Object} principal The principal to connect with this service.
 * @param {Object} callback Callback for the connect.
 *   @param {Object} callback.err If the authentication or create of this session failed, this will contain the error.
 *   @param {Object} callback.session The session for this principal with this service.
 *   @param {Object} callback.principal The principal used to connect the session.
 **/

Service.prototype.connect = function(principal, callback) {
    var p = principal;
    var self = this;

    this.store.get(p.toStoreId(), function(err, storedPrincipal) {
        if (!storedPrincipal) {
            self.authenticateSession(p, p.create, callback);
        } else {
            p.updateAttributes(storedPrincipal);
            self.authenticateSession(p, p.authenticate, callback);
        }
    });
};

/**
 * Internal method to run all the common steps of authentication against a Nitrogen service.
 *
 * @method authenticateSession
 * @async
 * @private
 * @param {Object} principal The principal to connect with this service.
 * @param {Object} authOperation The authorization method on the principal that is used to .
 * @param {Object} callback Callback for the connect.
 *   @param {Object} callback.err If the authentication operation failed, this will contain the error.
 *   @param {Object} callback.session The session for this principal with this service.
 *   @param {Object} callback.principal The principal used to connect the session.
 **/

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

            delete principal.password;

            if (principal.claim_code) {
                console.log('This principal (' + principal.id + ') can be claimed using code: ' + principal.claim_code);
            }

            self.store.set(principal.toStoreId(), principal.toStoreObject(), function(err) {
                var session = self.startSession(principal, accessToken);

                callback(null, session, principal);                
            });
        });
    });
};

/**
 * Impersonate a principal using the passed session
 *
 * @method impersonate
 * @async
 * @param {Object} session The session to use to authorize this impersonation
 * @param {Object} principal The principal to impersonate with this service.
 * @param {Object} callback Callback for the impersonation.
 *   @param {Object} callback.err If the impersonation failed, this will contain the error.
 *   @param {Object} callback.session The session for the impersonated principal with this service.
 *   @param {Object} callback.principal The impersonated principal.
 **/

Service.prototype.impersonate = function(session, principalId, callback) {
    var self = this;

    Principal.impersonate(session, principalId, function(err, impersonatedPrincipal, accessToken) {
        if (err) return callback(err);

        var session = self.startSession(impersonatedPrincipal, accessToken);

        impersonatedPrincipal.accessToken = accessToken;

        callback(null, session, impersonatedPrincipal);
    });
};

/**
 * Fetch the endpoint configuration for this service for this user. Before authenticating a principal, we first
 * ask the service to return the set of endpoints that we should for this principal to talk to the Nitrogen service.  Note, 
 * this might actually not be the same service, as Nitrogen may redirect clients to a different service or different endpoints.
 *
 * @method configure
 * @async
 * @private
 * @param {Object} config The default configuration to use to connect to Nitrogen.
 * @param {Object} principal The principal to configure for this service.
 * @param {Object} callback Callback for the impersonation.
 *   @param {Object} callback.err If the impersonation failed, this will contain the error.
 *   @param {Object} callback.config The configuration for this service with this principal.
 **/

Service.prototype.configure = function(config, principal, callback) {
    var headwaiter_url = config.headwaiter_endpoint;

    if (principal.is('user') && principal.email) {
        headwaiter_url += "?email=" + principal.email;
    } else if (principal.id && principal.id) {
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

/**
 * Clear all of the credentials for a particular principal.
 *
 * @method clearCredentials
 * @private
 * @param {Object} principal The principal to clear credentials for.
 **/

Service.prototype.clearCredentials = function(principal) {
    this.store.delete(principal.toStoreId());
};

/**
 * Connect subscription socket for principal with this accessToken to the service. 
 *
 * @method connectSocket
 * @privateses
 * @param {Object} principal The principal to open a subscription socket for.
 * @param {Object} accessToken The accessToken to open a subscription socket for.
 **/

Service.prototype.connectSocket = function(principal, accessToken) {
    if (!principal || !principal.id || !accessToken) throw new Error('need both principal and accessToken to connectSocket');

    // we can only share a socket on a per principal basis because otherwise principals can listen in
    // on other principals' events.
    if (!this.sockets[principal.id]) {
        var socket = io.connect(this.config.subscriptions_endpoint, {
            query: Service.queryStringFromObject({ auth: accessToken.token }),
            'force new connection': true
        });

        this.setupSocketEvents(socket);

        this.sockets[principal.id] = socket;
    }

    return this.sockets[principal.id];
};

Service.prototype.startSession = function(principal, accessToken) {
    var socket = this.connectSocket(principal, accessToken);
    var session = new Session(this, principal, accessToken, socket);

    this.sessions.push(session);

    return session;
};

Service.prototype.setupSocketEvents = function(socket) {
    var self = this;

    socket.on('connecting', function() { 
        self.sessions.forEach(function(session) { 
            session.log.info('session: socket.io connecting');
        });  
    });
    socket.on('connect', function() { 
        self.sessions.forEach(function(session) { 
            session.log.info('session: socket.io connected');
        });  
    });
    socket.on('disconnect', function() { 
       self.sessions.forEach(function(session) { 
            session.log.info('session: socket.io connection disconnected');
       });
    });

    socket.on('reconnecting', function() { 
       self.sessions.forEach(function(session) { 
            session.log.info('session: socket.io connection reconnecting');
       });
    });
    socket.on('reconnect', function() { 
        self.sessions.forEach(function(session) { 
            session.log.warn('session: socket.io connection reconnected.  restarting subscriptions: ' + JSON.stringify(session.subscriptions));
            session.restartSubscriptions(); 
        });  
    });
};

Service.queryStringFromObject = function(obj) {
    var str = [];

    for(var p in obj)
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));

    return str.join("&");
};

module.exports = Service;
