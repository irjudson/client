var EventLog = require('./eventLog')
  ,	Faye = require('faye');

function Session(service, principal, accessToken) {
	this.service = service;
	this.principal = principal;
    this.accessToken = accessToken;

    console.log("starting realtime connection to: " + this.service.config.realtime_endpoint);
	this.fayeClient = new Faye.Client(this.service.config.realtime_endpoint);
    this.subscriptions = [];
    this.authFailureCallback = function() {};

	this.log = new EventLog(this);
}

Session.prototype.close = function() {
    this.subscriptions.forEach(function(subscription) {
        subscription.cancel();
    });

    this.fayeClient.disconnect();
    this.fayeClient = null;
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