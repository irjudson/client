var Message = require('./message');

function Heartbeat(session) {
    this.session = session;
    this.heartbeatInterval = false;
}

Heartbeat.prototype.start = function() {
    if (this.heartbeatInterval) return;
    var self = this;

    this.heartbeatInterval = setInterval(function() {
        var message = new Message();
        message.type = "heartbeat";

        message.send(self.session, function(err, message) {
            if (err) { return self.session.log.error("failed to send heartbeat"); }
        });
    }, self.session.service.config.heartbeat_period * 1000 || 5 * 60 * 1000);
};

Heartbeat.prototype.stop = function() {
    if (!this.heartbeatInterval) return;

    clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = false;
};

module.exports = Heartbeat;
