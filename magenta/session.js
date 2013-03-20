var EventLog = require('./eventLog'),
	Faye = require('faye');

function Session(service, principal) {
	this.service = service;
	this.principal = principal;

	this.fayeClient = new Faye.Client(this.service.config.realtime_url);
	this.log = new EventLog(this);
}

Session.prototype.onMessage = function(callback) {
    this.fayeClient.subscribe('/messages', function(messageJSON) {
        console.log("realtime message received: " + messageJSON);
        callback(new magenta.Message(JSON.parse(messageJSON)));
    });
};

module.exports = Session;