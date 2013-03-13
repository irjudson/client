var EventLog = require('./eventLog'),
	faye = require('faye');

function Session(service, principal) {
	this.service = service;
	this.principal = principal;

	this.fayeClient = new faye.Client(this.service.config.realtime_url);
	this.log = new EventLog(this);
}

module.exports = Session;