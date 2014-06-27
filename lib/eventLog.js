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
        index_until: new Date(new Date().getTime() + logLifetime)
    });

    var principalNameOrId = (this.session.principal.name || this.session.principal.id);

    var dateFormat = [logMessage.ts.getMonth()+1, logMessage.ts.getDate(), logMessage.ts.getFullYear()];
    var date = dateFormat.join('/');

    console.log(date + " " + logMessage.ts.toLocaleTimeString() + ": " + principalNameOrId + ': ' + severity + ": " + message);

    logMessage.send(this.session);
};

module.exports = EventLog;