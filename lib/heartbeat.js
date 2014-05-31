var Message = require('./message');

function Heartbeat(session) {
    this.session = session;
    this.heartbeatTimeout = false;
    this.heartbeatReceived = true;
    this.consecutiveHeartbeatFailures = 0; 
}

Heartbeat.DEFAULT_INTERVAL = 30 * 1000;

Heartbeat.prototype.heartbeatReceivedCheck = function() {
    if (!this.heartbeatReceived) {
        this.session.log.error('heartbeat: not received within timeout: restarting subscriptions (' + this.consecutiveHeartbeatFailures + ' consecutive).');
        if (this.session && this.consecutiveHeartbeatFailures < 3) {
            this.stop();
            this.session.restartSubscriptions();
            this.consecutiveHeartbeatFailures += 1; 
            this.startInterval();
        } else {
            // too many consecutive heartbeat failures 

            this.session.log.error('heartbeat: too many consecutive failures. signalling session failure.');
            this.session.signalFailure();
        }
    }
};

Heartbeat.prototype.start = function() {
    if (this.heartbeatTimeout) return;
    var self = this;

    this.session.onMessage({ type: 'heartbeat' }, function(message) {
        // the goal of this is to test realtime connectivity so we don't care whose heartbeat this is.
        self.heartbeatReceived = true;
        this.consecutiveHeartbeatFailures = 0; 
    });

    this.startInterval();
};

Heartbeat.prototype.startInterval = function() {
    var self = this;

    this.stop();

    this.heartbeatTimeout = setInterval(function() {
        self.send();
    }, Heartbeat.DEFAULT_INTERVAL);
};

Heartbeat.prototype.send = function(callback) {
    var self = this;

    this.session.principal.status(function(err, status) {
        if (err) {
            status = status || {};
            status.error = err;
        }

        var heartbeatIndexUntil = self.session.service.config.heartbeat_lifetime || 30 * 60 * 1000;

        var message = new Message({
            type: 'heartbeat',
            public: false,
            body: {
                error: !!err,
                status: status
            },
            index_until: new Date(new Date().getTime() + heartbeatIndexUntil)
        });

        setTimeout(function() { self.heartbeatReceivedCheck() }, 10 * 1000);
        self.heartbeatReceived = false;

        message.send(self.session, function(err, message) {
            if (err) {
                self.session.log.error("failed to send heartbeat: " + err);

                // something is far more wrong than the subscription.
                self.heartbeatReceived = true;
                if (self.session) self.session.signalFailure();
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
