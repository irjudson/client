var Message = require('./message');

function Heartbeat(session) {
    this.session = session;
    this.heartbeatTimeout = false;
    this.heartbeatReceived = true;
}

Heartbeat.prototype.heartbeatReceivedCheck = function() {
    if (!this.heartbeatReceived) {
        this.session.log.error('heartbeat: not received within timeout: restarting session.');
        this.session.authFailureCallback();
    }
};

Heartbeat.prototype.start = function() {
    if (this.heartbeatTimeout) return;
    var self = this;

    this.session.onMessage({ type: 'heartbeat' }, function(message) {
        // the goal of this is to test socket.io connectivity so we don't care whose heartbeat this is.
        self.session.log.info('RECEIVED HEARTBEAT');
        self.heartbeatReceived = true;
    });

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

        setTimeout(function() { self.heartbeatReceivedCheck() }, 10 * 1000);
        self.heartbeatReceived = false;        

        message.send(self.session, function(err) {
            if (err) { 
                self.session.log.error("failed to send heartbeat: " + err);

                // something is far more wrong than the subscription.
                self.heartbeatReceived = true;        
            }

            if (callback) return callback(err);
        });
        self.session.log.info('SENT HEARTBEAT');
    });
};

Heartbeat.prototype.stop = function() {
    if (!this.heartbeatTimeout) return;

    clearInterval(this.heartbeatTimeout);
    this.heartbeatTimeout = false;
};

module.exports = Heartbeat;
