var Message = require('./message');

function Heartbeat(session) {
    this.session = session;
    this.heartbeatInterval = false;
}

Heartbeat.prototype.start = function() {
    if (this.heartbeatInterval) return;
    var self = this;

    console.log("starting heartbeat");

    this.heartbeatInterval = setInterval(function() {
        var message = new Message();
        message.message_type = "heartbeat";

        console.log("sending heartbeat");
        message.save(this.session, function(err, message) {
            if (err) { return this.session.log.error("failed to send heartbeat"); }
        });
    }, self.session.service.config.heartbeat_period || 10 * 60 * 1000);
};

Heartbeat.prototype.stop = function() {
    if (!this.heartbeatInterval) return;

    clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = false;
};

module.exports = Heartbeat;