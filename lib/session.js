var EventLog = require('./eventLog')
  , Heartbeat = require('./heartbeat')
  , io = require('socket.io-client')
  , Message = require('./message')
  , Principal = require('./principal')
  , request = require('request');
  
/**
 * A Session represents an authenticated session and subscription connection between a principal and a service.
 *
 * @class Session
 * @namespace nitrogen
 * @param {Object} service The service this session is associated with.
 * @param {Object} principal The principal this session is associated with.
 * @param {Object} accessToken The accessToken to use for authenticating requests with this session.
 * @param {Object} socket The subscription socket to use for realtime updates.
 */

function Session(service, principal, accessToken) {
    this.service = service;
    this.principal = principal;
    this.accessToken = accessToken;

    this.subscriptionCount = 0;
    this.sessionId = Math.floor(Math.random()*100000000);

    this.subscriptions = {};
    this.authFailureCallback = function() {};

    this.log = new EventLog(this);
    this.log.start();
}

Session.queryStringFromObject = function(obj) {
    var str = [];

    for(var p in obj)
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));

    return str.join("&");
};

/**
 * Stop the session with the service.
 *
 * @method stop
 * @private
 **/

Session.prototype.stop = function() {
    this.service.stopSession(this);
    this.authFailureCallback = null;

    var self = this;
    for (var key in this.subscriptions) {
        this.disconnectSubscription(this.subscriptions[key]);        
    }

    if (this.socket)
        this.socket.disconnect();

    this.socket = null;

    if (this.heartbeat) 
        this.heartbeat.stop();

    this.heartbeat = null;
    
    this.log.stop();
};

Session.prototype.beforeRequest = function(options) {
    if (!options.headers) options.headers = {};
    options.headers.Authorization = "Bearer " + this.accessToken.token;

    var prefix = "?";
    if (options.query) {
        var queryString = JSON.stringify(options.query);
        options.url += prefix + "q=" + encodeURIComponent(queryString);
        delete options.query;

        prefix = "&";
    }

    if (options.queryOptions) {
        var optionsString = JSON.stringify(options.queryOptions);
        options.url += prefix + "options=" + encodeURIComponent(optionsString);
        delete options.queryOptions;
    }
};

Session.prototype.afterRequest = function(err, resp, body, callback) {
    if (resp && resp.statusCode !== 200) {
        if (typeof body !== 'object')
            body = JSON.parse(body);

        if (body && body.error)
            err = body.error;
        else
            err = resp.statusCode;
    }

    if (resp && resp.statusCode === 401) this.authFailureCallback();

    // If we get an access token update, replace the current access token and continue.
    if (resp && resp.headers && resp.headers['x-n2-set-access-token']) {
        this.accessToken = JSON.parse(resp.headers['x-n2-set-access-token']);
        this.principal.accessToken = this.accessToken;

        // if we have a store, update the principal there.  (agents don't have a store)
        if (this.service.store) {
            this.service.store.set(this.principal.toStoreId(), this.principal.toStoreObject());
        }
    }

    callback(err, resp, body);
};

Session.prototype.makeRequest = function(options, requestFunc, callback) {
    var self = this;

    this.beforeRequest(options);
    return requestFunc(options, function(err, resp, body) {
        self.afterRequest(err, resp, body, callback);
    });
};

Session.prototype.get = function(options, callback) {
    return this.makeRequest(options, request.get, callback);
};

Session.prototype.post = function(options, callback) {
    return this.makeRequest(options, request.post, callback);
};

Session.prototype.put = function(options, callback) {
    return this.makeRequest(options, request.put, callback);
};

Session.prototype.remove = function(options, callback) {
    return this.makeRequest(options, request.del, callback);
};

/**
 * Clear all of the credentials for a particular principal.
 *
 * @method clearCredentials
 * @private
 * @param {Object} principal The principal to clear credentials for.
 **/

Session.prototype.clearCredentials = function() {
    this.service.clearCredentials(this.principal);
};

/**
 * Connect subscription socket for principal with this accessToken to the service. 
 *
 * @method connectSocket
 * @private
 **/

Session.prototype.connectSocket = function() {
    var self = this;
    if (!this.principal || !this.principal.id || !this.accessToken) throw new Error('need both principal and accessToken to connectSocket');

    // we can only share a socket on a per principal basis because otherwise principals can listen in
    // on other principals' events.
    if (!this.socket) {
        this.socket = io.connect(this.service.config.subscriptions_endpoint, {
            query: Session.queryStringFromObject({ auth: this.accessToken.token }),
            'force new connection': true
        });

        this.setupSocketEvents();

        self.heartbeat = new Heartbeat(self);
        self.heartbeat.start();
    }

    return this.socket;
};

Session.prototype.setupSocketEvents = function() {
    var self = this;

    //this.socket.on('connecting', function() { self.log.info('session: socket.io connecting'); });
    
    this.socket.on('connect', function() { 
        self.log.info('session: socket.io connected'); 
    });

    this.socket.on('disconnect', function() { 
        self.log.info('session: socket.io connection disconnected');
    });

    // this.socket.on('reconnecting', function() { self.log.info('session: socket.io connection reconnecting'); });

    // this.socket.on('reconnect', function() {  
    //    self.log.warn('session: socket.io connection reconnected.  restarting subscriptions: ' + JSON.stringify(self.subscriptions));
    //    self.restartSubscriptions(); 
    // });
};

/**
 * Disconnect the current subscription connection with the service.
 *
 * @method disconnectSubscription
 * @private
 **/

Session.prototype.disconnectSubscription = function(subscriptionId) {
    if (!this.subscriptions[subscriptionId]) return;

    this.socket.emit('stop', this.subscriptions[subscriptionId]);
    delete this.subscriptions[subscriptionId];
};

/**
 * Connect a subscription with the service.
 *
 * @method disconnectSubscription
 * @private
 **/

Session.prototype.connectSubscription = function(options) {
    this.subscriptions[options.id] = options;
    this.socket.emit('start', options);
    this.log.info('connected subscription: ' + JSON.stringify(options));
};

/**
 * Restart all subscriptions with the service.  Used after a connection disruption.
 *
 * @method restartSubscriptions
 * @private
 **/

Session.prototype.restartSubscriptions = function() {
    for (var key in this.subscriptions) {
        var subscription = this.subscriptions[key];
        this.log.info('restarting subscription: ' + key + ': ' + JSON.stringify(subscription));
        this.connectSubscription(this.subscriptions[key]);        
    }
}

/**
 * Impersonate the principal with the authorization context of this session.  Used by the Nitrogen service to impersonate principals for agent setup.
 *
 * @method impersonate
 * @private
 * @param {Object} principal The principal to impersonate with this session.
 * @param {Object} callback Callback for the impersonation.
 *   @param {Object} callback.err If the impersonation failed, this will contain the error.
 *   @param {Object} callback.session The session for the impersonated principal with this service.
 *   @param {Object} callback.principal The impersonated principal.
 **/

Session.prototype.impersonate = function(principal, callback) {
    this.service.impersonate(this, principal, callback);
};

/**
 * Provide a callback function on authentication failure.
 *
 * @method onAuthFailure
 * @param {Object} principal The principal to impersonate with this session.
 * @param {Function} callback Callback function with signature f(err).
 **/

Session.prototype.onAuthFailure = function(callback) {
    this.authFailureCallback = callback;
};

/**
 * Core subscription event method. Primarily used to subscribe for changes to principals and new messages.
 *
 * @method on
 * @param {Object} options Options for the filter of the messages this subscription should receive: 'type': The type this subscription should receive.  Only 'message' is currently supported. 'filter': The filter to apply to the objects returned from this subscription.  For example { from: '51f2735fda5fcca439000001' } will restrict messages received to only those from this particular principal id.
 * @param {Function} callback Callback function with signature f(objectReceived).
 **/

Session.prototype.on = function(options, callback) {
    if (!options) return callback("Options hash required for subscription");
    if (options.type !== 'message') return callback("Unknown subscription 'type'");

    // if there is an existing socket connection already, this will be a NOP.
    this.connectSocket();

    this.subscriptionCount += 1;
    options.id = this.principal.id + "_" + this.sessionId + "_" + this.subscriptionCount;

    this.socket.on(options.id, function(obj) {
        if (options.type === 'message')
            return callback(new Message(obj));
    });

    this.connectSubscription(options);
    return options.id;
};

/**
 * Syntax sugar to setup a message subscription.
 *
 * @method onMessage
 * @param {Object} filter The filter to apply to the objects returned from this subscription.  For example { from: '51f2735fda5fcca439000001' } will restrict messages received to only those from this particular principal id.
 * @param {Function} callback Callback function with signature f(messageReceived).
 **/

Session.prototype.onMessage = function(filter, callback) {
    if (typeof filter === 'function') {
        callback = filter;
    }

    var options = {};
    options.filter = filter || {};
    options.type = 'message';
    return this.on(options, callback);
};

module.exports = Session;