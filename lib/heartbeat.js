var Message = require('./message');

function Heartbeat(session) {
    this.session = session;
    this.heartbeatTimeout = false;
}

Heartbeat.prototype.start = function() {
    if (this.heartbeatTimeout) return;
    var self = this;

    this.heartbeatTimeout = setInterval(function() {
        self.send();    
    }, self.session.service.config.heartbeat_period * 1000 || 5 * 60 * 1000);
};

Heartbeat.prototype.send = function(callback) {
    var self = this;

    this.session.principal.status(function(err, status) {
        if (err) {
            status = status || {};
            status.error = err;
        }

        var heartbeatLifetime = self.session.service.config.heartbeat_lifetime || 24 * 60 * 60000;

        var message = new Message({
            type: 'heartbeat',
            public: false,
            body: {
                error: !!err,
                status: status
            },
            expires: new Date(new Date().getTime() + heartbeatLifetime)
        });

        message.send(self.session, function(err) {
            if (err) { 
                self.session.log.error("failed to send heartbeat: " + err);
            }

            if (callback) return callback(err);
        });
    });
};

Heartbeat.prototype.stop = function() {
    if (!this.heartbeatTimeout) return;

    clearInterval(this.heartbeatTimeout);
    this.heartbeatTimeout = false;
};

module.exports = Heartbeat;
