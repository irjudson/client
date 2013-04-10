var Message = require('./message');

function Heartbeat(session) {
    this.session = session;
    this.heartbeatInterval = false;
}

Heartbeat.prototype.start = function() {
    if (this.heartbeatInterval) return;
    var self = this;

    this.hearbeatInterval = setInterval(function() {
        var message = new Message();
        message.message_type = "heartbeat";
        message.save(this.session);
    }, self.session.service.config.heartbeat_period || 10 * 60 * 1000);
};

Heartbeat.prototype.stop = function() {
    if (!this.heartbeatInterval) return;

    clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = false;
};

module.exports = Heartbeat;