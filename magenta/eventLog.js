var Message = require('./message');

function EventLog(session) {
	this.session = session;
	this.connected = false;
	this.queue = [];

	this.connect();
}

EventLog.prototype.debug = function(message) { this.log("debug", message); };
EventLog.prototype.info = function(message)  { this.log("info", message);  };
EventLog.prototype.error = function(message) { this.log("error", message); };
EventLog.prototype.log = function(severity, message) {
	var log_message = new Message();

	log_message.message_type = "log";
	log_message.body = { severity: severity, message: message };
	log_message.from = this.session.principal.id;
	log_message.timestamp = new Date();

	this.queue.push(log_message);
	console.log(log_message.timestamp + ": " + severity + ": " + message);
};

EventLog.prototype.connect = function() {
	if (this.connected) return;
	this.connected = true;
    var self = this;

	setInterval(function() {
	    var logs = self.queue.splice(0, self.queue.length);
	    if (logs.length == 0) {
	    	//console.log("no event logs to upload");
	    	return;
	    }

	    console.log("uploading " + logs.length + " event logs.");
	    Message.saveMany(self.session, logs, function(err, resp, body) {
	    	if (err) return;

	    	// remove sent logs - use splice since logs could have arrived in the meantime.
		    console.log("uploaded " + logs.length + " event logs successfully.");
	    });
	}, self.session.service.config.log_upload_period || 5000);
};

module.exports = EventLog;