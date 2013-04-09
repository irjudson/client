var EventLog = require('./eventLog')
  ,	Faye = require('faye')
  , Heartbeat = require('./heartbeat');

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
    this.log.start();
}

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

    var subscription = this.fayeClient.subscribe('/messages', function(messageJSON) {
        console.log("realtime message received: " + messageJSON);
        callback(new magenta.Message(JSON.parse(messageJSON)));
    });

    // TODO: handle errors signalled with .errback

    this.subscriptions.push(subscription);
};

module.exports = Session;