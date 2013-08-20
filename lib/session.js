var EventLog = require('./eventLog')
  , io = require('socket.io-client')
  , Heartbeat = require('./heartbeat')
  , Message = require('./message')
  , Principal = require('./principal');

function Session(service, principal, accessToken) {
	this.service = service;
	this.principal = principal;
    this.accessToken = accessToken;

    this.subscriptions = {};
    this.authFailureCallback = function() {};

    this.log = new EventLog(this);
    this.log.start();

    this.heartbeat = new Heartbeat(this);
    this.heartbeat.start();

    this.subscriptionCount = 0;
    this.sessionId = Math.floor(Math.random()*100000000);

    this.socket = io.connect(this.service.config.subscriptions_endpoint, {
        query: Session.queryStringFromObject({ auth: this.accessToken.token })
    });

    this.socket.on('connecting', function() { console.log('**** socket.io connecting.') });
    this.socket.on('connect', function() { console.log('**** socket.io connected.') });
    this.socket.on('reconnect', function() { console.log('**** socket.io reconnected.') });
    this.socket.on('reconnecting', function() { console.log('**** socket.io reconnecting.') });
    this.socket.on('disconnect', function() { console.log('**** socket.io disconnection.') });
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
    if (options.type !== "messages" && options.type !== "principals") return callback("Unknown subscription type");

    this.subscriptionCount += 1;
    options.id = this.principal.id + "_" + this.sessionId + "_" + this.subscriptionCount;

    this.socket.on(options.id, function(obj) {
        if (options.type === 'messages')
            return callback(new Message(obj));
        else if (options.type === 'principals')
            return callback(new Principal(obj));
    });

    this.socket.emit('start', options);

    this.subscriptions[options.id] = options;
    return options.id;
};

Session.prototype.onMessage = function(options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    options.type = 'messages';
    return this.on(options, callback);
};

Session.prototype.onPrincipal = function(options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    options.type = 'principals';
    return this.on(options, callback);
};

Session.queryStringFromObject = function(obj) {
    var str = [];

    for(var p in obj)
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));

    return str.join("&");
};

module.exports = Session;