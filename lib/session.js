var EventLog = require('./eventLog')
  , Heartbeat = require('./heartbeat')
  , Message = require('./message')
  , Principal = require('./principal');

function Session(service, principal, accessToken, socket) {
	this.service = service;
	this.principal = principal;
    this.accessToken = accessToken;
    this.socket = socket;

    this.subscriptions = {};
    this.authFailureCallback = function() {};

    this.log = new EventLog(this);
    this.log.start();

    this.heartbeat = new Heartbeat(this);
    this.heartbeat.start();

    this.subscriptionCount = 0;
    this.sessionId = Math.floor(Math.random()*100000000);
}

Session.prototype.clearCredentials = function() {
    this.service.clearCredentials(this.principal);
};

Session.prototype.close = function() {
    var self = this;
    for (var key in this.subscriptions) {
        this.disconnectSubscription(this.subscriptions[key]);        
    }

    this.heartbeat.stop();
    this.log.stop();
};

Session.prototype.disconnectSubscription = function(subscriptionId) {
    if (!this.subscriptions[subscriptionId]) return;

    this.socket.emit('stop', this.subscriptions[subscriptionId]);
    delete this.subscriptions[subscriptionId];
};

Session.prototype.impersonate = function(principal, callback) {
    this.service.impersonate(this, principal, callback);
};

Session.prototype.onAuthFailure = function(callback) {
    this.authFailureCallback = callback;
};

Session.prototype.on = function(options, callback) {
    if (!options) return callback("Options hash required for subscription");
    if (options.type !== 'message' && options.type !== 'principal') return callback("Unknown subscription type");

    this.subscriptionCount += 1;
    options.id = this.principal.id + "_" + this.sessionId + "_" + this.subscriptionCount;

    this.socket.on(options.id, function(obj) {
        if (options.type === 'message')
            return callback(new Message(obj));
        else if (options.type === 'principal')
            return callback(new Principal(obj));
    });

    this.socket.emit('start', options);

    this.subscriptions[options.id] = options;
    return options.id;
};

Session.prototype.onMessage = function(filter, callback) {
    if (typeof filter === 'function') {
        callback = filter;
    }

    this.log.warn("using deprecated function onMessage:  Use 'on' instead.");
    this.log.warn(new Error().stack);

    var options = {};
    options.filter = filter || {};
    options.type = 'message';
    return this.on(options, callback);
};

Session.prototype.onPrincipal = function(filter, callback) {
    if (typeof filter === 'function') {
        callback = filter;
    }

    this.log.warn("WARN: using deprecated function onPrincipal:  Use 'on' instead.");
    this.log.warn(new Error().stack);
    
    var options = {};
    options.filter = filter || {};
    options.type = 'principal';
    return this.on(options, callback);
};

module.exports = Session;
