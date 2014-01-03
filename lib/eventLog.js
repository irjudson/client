var Message = require('./message');

function EventLog(session) {
    this.session = session;
    this.eventLogInterval = false;
    this.queue = [];
}

EventLog.prototype.debug = function(message) { this.log("debug", message); };
EventLog.prototype.info = function(message)  { this.log("info", message);  };
EventLog.prototype.warn = function(message) { this.log("warn", message); };
EventLog.prototype.error = function(message) { this.log("error", message); };
EventLog.prototype.log = function(severity, message) {
    if (this.session.service.config.log_levels && this.session.service.config.log_levels.indexOf(severity) === -1) return;

    var logLifetime = this.session.service.config.log_lifetime || 24 * 60 * 60000;

    var logMessage = new Message({
        type: 'log',
        ts: new Date(),
        from: this.session.principal.id,
        body: {
            severity: severity,
            message: message
        },
        expires: new Date(new Date().getTime() + logLifetime)
    });

    this.queue.push(logMessage);
    var principalNameOrId = (this.session.principal.name || this.session.principal.id);

    var dateFormat = [logMessage.ts.getMonth()+1, logMessage.ts.getDate(), logMessage.ts.getFullYear()];
    var date = dateFormat.join('/');

    console.log(date + " " + logMessage.ts.toLocaleTimeString() + ": " + principalNameOrId + ': ' + severity + ": " + message);
};

EventLog.prototype.start = function() {
    if (this.eventLogInterval) return;
    var self = this;

    this.eventLogInterval = setInterval(function() {
        var logs = self.queue.splice(0, self.queue.length);
        if (logs.length === 0) return;

        Message.sendMany(self.session, logs, function(err, resp, body) {
            if (err) return console.log('uploading logs for principal ' + self.session.principal.id + ' (' + self.session.principal.name + ') failed: ' + err);

            // remove sent logs - use splice since logs could have arrived in the meantime.
            console.log("uploaded " + logs.length + " event logs successfully for principal: " + self.session.principal.id + ' (' + self.session.principal.name + ')');
        });
    }, self.session.service.config.log_upload_period || 5000);
};

EventLog.prototype.stop = function() {
    if (!this.eventLogInterval) return;

    clearInterval(this.eventLogInterval);
    this.eventLogInterval = false;
};

module.exports = EventLog;
