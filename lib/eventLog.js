var Message = require('./message');

function EventLog(session) {
	this.session = session;
	this.eventLogInterval = false;
	this.queue = [];
}

EventLog.prototype.debug = function(message) { this.log("debug", message); };
EventLog.prototype.info = function(message)  { this.log("info", message);  };
EventLog.prototype.error = function(message) { this.log("error", message); };
EventLog.prototype.log = function(severity, message) {
	var log_message = new Message({
        type: 'log',
        ts: new Date(),
        from: this.session.principal.id,
        body: {
            severity: severity,
            message: message
        }
    });

	this.queue.push(log_message);
	console.log(log_message.ts + ": " + severity + ": " + message);
};

EventLog.prototype.start = function() {
	if (this.eventLogInterval) return;
    var self = this;

    this.eventLogInterval = setInterval(function() {
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

EventLog.prototype.stop = function() {
    if (!this.eventLogInterval) return;

    clearInterval(this.eventLogInterval);
    this.eventLogInterval = false;
};

module.exports = EventLog;
