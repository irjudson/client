var EventLog = require('./eventLog')
  ,	Faye = require('faye')
  , Heartbeat = require('./heartbeat')
  , Message = require('./message');

function Session(service, principal, accessToken) {
    var self=this;

	this.service = service;
	this.principal = principal;
    this.accessToken = accessToken;

	this.fayeClient = new Faye.Client(this.service.config.realtime_endpoint);
    this.fayeClient.addExtension({
        outgoing: function(message, callback) {
            message.ext = message.ext || {};
            message.ext.access_token = self.accessToken.token;
            callback(message);
        }
    });

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
        subscription.cancel();
    });

    this.fayeClient.disconnect();
    this.fayeClient = null;

    this.heartbeat.stop();
    this.log.stop();
};

Session.prototype.onAuthFailure = function(callback) {
    this.authFailureCallback = callback;
};

Session.prototype.onMessage = function(callback) {
    if (!this.fayeClient) return callback("Session previously closed");

    var self = this;

    var subscription = this.fayeClient.subscribe('/messages/' + this.principal.id, function(messageJSON) {
        var message = new Message(JSON.parse(messageJSON));
        callback(message);
    });

    subscription.errback(function(error) {
        self.log.error("realtime subscription error: " + error);
        if (self.authFailureCallback) self.authFailureCallback();
    });

    this.subscriptions.push(subscription);
};

Session.prototype.onPrincipal = function(callback) {
    if (!this.fayeClient) return callback("Session previously closed");

    var self = this;

    var subscription = this.fayeClient.subscribe('/principals/' + this.principal.id, function(principalJSON) {
        var principal = new Principal(JSON.parse(principalJSON));
        callback(principal);
    });

    subscription.errback(function(error) {
        self.log.error("realtime subscription error: " + error);
        if (self.authFailureCallback) self.authFailureCallback();
    });

    this.subscriptions.push(subscription);
};

Session.prototype.impersonate = function(principal, callback) {
    this.service.impersonate(this, principal, callback);
};

module.exports = Session;