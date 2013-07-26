var EventLog = require('./eventLog')
  , io = require('socket.io-client')
  , Heartbeat = require('./heartbeat')
  , Message = require('./message')
  , utils = require('./utils');

function Session(service, principal, accessToken) {
    var self=this;

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

Session.prototype.onAuthFailure = function(callback) {
    this.authFailureCallback = callback;
};

Session.prototype.on = function(options, callback, status) {
    if (!options) return callback("Options hash required for subscription");
    if (options.type !== "messages" && options.type !== "principals") return callback("Unknown subscription type");

    options.auth = this.accessToken.token;

    var socket = io.connect(this.service.config.subscriptions_endpoint,
                                  { query: utils.queryStringFromObject(options) });

    socket.on(options.type, function(err, obj) {
        if (err) return callback(err);

        console.dir(obj);

        if (options.type === 'messages')
            return callback(null, new Message(obj));
        else if (options.type === 'principals')
            return callback(null, new Principal(obj));
    });

    socket.on('error', status || utils.nop);
    socket.on('ready', status || utils.nop);

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

Session.prototype.impersonate = function(principal, callback) {
    this.service.impersonate(this, principal, callback);
};

module.exports = Session;