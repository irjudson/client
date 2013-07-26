var EventLog = require('./eventLog')
  , io = require('socket.io-client')
  , Heartbeat = require('./heartbeat')
  , Message = require('./message')
  , Principal = require('./principal');

function Session(service, principal, accessToken) {
	this.service = service;
	this.principal = principal;
    this.accessToken = accessToken;

    this.subscriptions = [];
    this.authFailureCallback = function() {};

	this.log = new EventLog(this);
    this.log.start();

    this.heartbeat = new Heartbeat(this);
    this.heartbeat.start();
}

Session.prototype.clearCredentials = function() {
    this.service.clearCredentials(this.principal);
};

Session.prototype.close = function() {
    this.subscriptions.forEach(function(subscription) {
        subscription.disconnect();
    });

    this.subscriptions = [];
    this.heartbeat.stop();
    this.log.stop();
};

Session.prototype.impersonate = function(principal, callback) {
    this.service.impersonate(this, principal, callback);
};

Session.prototype.onAuthFailure = function(callback) {
    this.authFailureCallback = callback;
};

Session.prototype.on = function(options, callback, status) {
    if (!options) return callback("Options hash required for subscription");
    if (options.type !== "messages" && options.type !== "principals") return callback("Unknown subscription type");

    options.auth = this.accessToken.token;

    var socket = io.connect(this.service.config.subscriptions_endpoint, {
                                query: Session.queryStringFromObject(options),
                                'force new connection': true
                            });

    socket.on(options.type, function(obj) {
        if (options.type === 'messages')
            return callback(new Message(obj));
        else if (options.type === 'principals')
            return callback(new Principal(obj));
    });

    var statusFunc = status || function() {};

    socket.on('error', statusFunc);
    socket.on('ready', statusFunc);

    this.subscriptions.push(socket);
};

Session.prototype.onMessage = function(options, callback, status) {
    if (typeof options === 'function') {
        status = callback;
        callback = options;
        options = {};
    }

    options.type = 'messages';
    this.on(options, callback, status);
};

Session.prototype.onPrincipal = function(options, callback, status) {
    if (typeof options === 'function') {
        status = callback;
        callback = options;
        options = {};
    }

    options.type = 'principals';
    this.on(options, callback, status);
};

Session.queryStringFromObject = function(obj) {
    var str = [];

    for(var p in obj)
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));

    return str.join("&");
};

module.exports = Session;