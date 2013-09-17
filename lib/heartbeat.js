var Message = require('./message');

function Heartbeat(session) {
    this.session = session;
    this.heartbeatTimeout = false;
}

Heartbeat.prototype.start = function() {
    if (this.heartbeatTimeout) return;
    var self = this;

    this.heartbeatTimeout = setInterval(function() {
        self.session.principal.status(function(err, status) {
            if (err) {
                status = status || {};
                status.error = err;
            }

            var message = new Message({
                type: 'heartbeat',
                public: false,
                body: {
                    error: !!err,
                    status: status
                }
            });

            message.send(self.session, function(err) {
                if (err) { return self.session.log.error("failed to send heartbeat: " + err); }
            });
        });
    }, self.session.service.config.heartbeat_period * 1000 || 5 * 60 * 1000);
};

Heartbeat.prototype.stop = function() {
    if (!this.heartbeatTimeout) return;

    clearInterval(this.heartbeatTimeout);
    this.heartbeatTimeout = false;
};

module.exports = Heartbeat;
