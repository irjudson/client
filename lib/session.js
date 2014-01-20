var EventLog = require('./eventLog')
  , Heartbeat = require('./heartbeat')
  , io = require('socket.io-client')
  , Message = require('./message')
  , Principal = require('./principal');

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

    this.heartbeat = new Heartbeat(this);
    this.heartbeat.start();
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
    var self = this;
    for (var key in this.subscriptions) {
        this.disconnectSubscription(this.subscriptions[key]);        
    }

    if (this.socket)
        this.socket.disconnect();

    this.heartbeat.stop();
    this.log.stop();
};

/**
 * Connect subscription socket for principal with this accessToken to the service. 
 *
 * @method connectSocket
 * @privateses
 * @param {Object} principal The principal to open a subscription socket for.
 * @param {Object} accessToken The accessToken to open a subscription socket for.
 **/

Session.prototype.connectSocket = function() {
    if (!this.principal || !this.principal.id || !this.accessToken) throw new Error('need both principal and accessToken to connectSocket');

    // we can only share a socket on a per principal basis because otherwise principals can listen in
    // on other principals' events.
    if (!this.socket) {
        this.socket = io.connect(this.service.config.subscriptions_endpoint, {
            query: Session.queryStringFromObject({ auth: this.accessToken.token }),
            'force new connection': true
        });

        this.setupSocketEvents();
    }

    return this.socket;
};

Session.prototype.setupSocketEvents = function() {
    var self = this;

    this.socket.on('connecting', function() { self.log.info('session: socket.io connecting'); });
    this.socket.on('connect', function() { self.log.info('session: socket.io connected'); });
    this.socket.on('disconnect', function() { self.log.info('session: socket.io connection disconnected'); });
    this.socket.on('reconnecting', function() { self.log.info('session: socket.io connection reconnecting'); });

    this.socket.on('reconnect', function() {  
        self.log.warn('session: socket.io connection reconnected.  restarting subscriptions: ' + JSON.stringify(self.subscriptions));
        self.restartSubscriptions(); 
    });
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
 * @param {Object} callback Callback for the authentication failure.
 *   @param {Object} callback.err If the impersonation failed, this will contain the error.
 *   @param {Object} callback.session The session for the impersonated principal with this service.
 *   @param {Object} callback.principal The impersonated principal.
 **/

Session.prototype.onAuthFailure = function(callback) {
    this.authFailureCallback = callback;
};

/**
 * Core subscription event method. Primarily used to subscribe for changes to principals and new messages.
 *
 * @method on
 * @param {Object} options Options for what this subscription would like to receive.
 *   @param {String} options.type The type this subscription should receive.  One of 'message' or 'principal'.
 *   @param {Object} options.filter The filter to apply to the objects returned from this subscription.  For example { from: '51f2735fda5fcca439000001' } will restrict messages received to only those from this particular principal id.
 * @param {Object} callback Callback for event.
 *   @param {Object} callback.object The received event.  Is either a principal or message object depending on the type of the subscription requested.
 **/

Session.prototype.on = function(options, callback) {
    if (!options) return callback("Options hash required for subscription");
    if (options.type !== 'message' && options.type !== 'principal') return callback("Unknown subscription type");

    // if there is an existing socket connection already, this will be a NOP.
    this.connectSocket();

    this.subscriptionCount += 1;
    options.id = this.principal.id + "_" + this.sessionId + "_" + this.subscriptionCount;

    this.socket.on(options.id, function(obj) {
        if (options.type === 'message')
            return callback(new Message(obj));
        else if (options.type === 'principal')
            return callback(new Principal(obj));
    });

    this.connectSubscription(options);
    return options.id;
};

/**
 * Syntax sugar to setup a message subscription.
 *
 * @method onMessage
 * @param {Object} options.filter The filter to apply to the objects returned from this subscription.  For example { from: '51f2735fda5fcca439000001' } will restrict messages received to only those from this particular principal id.
 * @param {Object} callback Callback for event.
 *   @param {Object} callback.message The message received as part of the subscription.
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

/**
 * Syntax sugar to setup a principal subscription.
 *
 * @method onPrincipal
 * @param {Object} options.filter The filter to apply to the objects returned from this subscription.  For example { id: '51f2735fda5fcca439000001' } will restrict messages received to only those for this particular principal id.
 * @param {Object} callback Callback for event.
 *   @param {Object} callback.principal The principal received as part of this subscription.
 **/

// NOT CURRENTLY SUPPORTED

// Session.prototype.onPrincipal = function(filter, callback) {
//   if (typeof filter === 'function') {
//       callback = filter;
//    }

//    var options = {};
//    options.filter = filter || {};
//    options.type = 'principal';
//    return this.on(options, callback);
//};

module.exports = Session;