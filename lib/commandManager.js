var Message = require('./message');

function CommandManager(device) {
    this.device = device;
    this.executing = false;
    this.messageQueue = [];
}

// obsolete: returns true if downstream message makes obsolete the upstream message.
CommandManager.obsoletes = function(downstreamMsg, upstreamMsg) {
    if (downstreamMsg.ts < upstreamMsg.ts) return false;
    if (downstreamMsg.expired()) return false;
    if (upstreamMsg.expired()) return true;

    return false;
};

// Look for obsolete and expired messages and remove these from the
// current set of camera commands.  Runs synchronously on messageQueue.
CommandManager.prototype.collapse = function() {
    var collapsedMessages = [];
    var upstreamMessage;
    var self = this;

    this.sortQueue();

    // first, strip all non relevant messages.
    var relevantMessages = [];
    this.messageQueue.forEach(function(message) {
        if (self.isRelevant(message)) {
            relevantMessages.push(message);
        }
    });

    // dequeue the first message in the message queue leaving only the downstream messages...
    while (upstreamMessage = relevantMessages.shift()) {
        if (upstreamMessage.is('cameraCommand')) {
            var idx;
            var obsoleted = false;
            for (idx=0; idx < relevantMessages.length && !obsoleted; idx++) {
                var downstreamMessage = relevantMessages[idx];
                obsoleted = this.obsoletes(downstreamMessage, upstreamMessage);
            }

            if (!obsoleted) {
                collapsedMessages.push(upstreamMessage);
                console.log('collapse: message: ' + upstreamMessage.from + '->' + upstreamMessage.to + ' not obsolete, ');
            } else {
                console.log('collapse: message: ' + upstreamMessage.from + '->' + upstreamMessage.to + ' has been obsoleted, removing.')
            }
        } else {
            console.log('collapse: message: ' + upstreamMessage.from + '->' + upstreamMessage.to + ' is type: ' + upstreamMessage.type + ': removing.');
        }
    }

    this.messageQueue = collapsedMessages;
};

CommandManager.prototype.execute = function() {
    var self = this;

    if (!this.device) return console.log('execute: not in session of device, skipping execution.');
    if (this.executing) return console.log('execute: already executing command, skipping execute. current queue: ' + JSON.stringify(this.messageQueue));
    if (!this.messageQueue || this.messageQueue.length === 0) return console.log('execute: no messages in messageQueue, skipping execute.');

    console.log('execute: executing queue: ' + this.messageQueue.length + ': ' + JSON.stringify(this.messageQueue));

    var msToExecute = this.messageQueue[0].millisToTimestamp();
    if (msToExecute > 0) {
        console.log('execute: top message occurs in the future, setting timeout.');
        return setTimeout(function() { self.execute(); }, msToExecute);
    }

    this.executing = true;
    this.executeQueue(function(err) {
        self.executing = false;
        if (err) console.log('execution error: ' + err);

        // kick off a new execution pass on the command queue.
        setTimeout(function() { self.execute(); }, 0);
    });
};

CommandManager.prototype.activeCommands = function() {
    var filtered = [];
    this.messageQueue.forEach(function(message) {
        if (message.millisToTimestamp() <= 0) {
            filtered.push(message);
        }
    });

    return filtered;
};

CommandManager.prototype.process = function(message) {
    // message could cancel a previous command, be a new command, or be a response to a previous command.
    // so add it and then collapse the command queue.

    if (!this.isRelevant(message)) return;

    // console.log("@@@@@ commandManager: processing new message: " + JSON.stringify(message));

    this.messageQueue.push(message);
    this.collapse();

    var self = this;

    if (message.expires) {
        var nextExpiration = Math.max(message.millisToExpiration(), 0);

        // console.log('process: setting expiration timeout of: ' + nextExpiration + ' for command: ' + JSON.stringify(message));
        setTimeout(function() { self.collapse(); }, nextExpiration);
    }
};

CommandManager.prototype.sortQueue = function() {
    this.messageQueue.sort(function(a,b) {
        return a.ts - b.ts;
    });
};

CommandManager.prototype.start = function(session, filter, callback) {
    this.session = session;

    var self = this;
    Message.find(session, filter, { sort: { ts: 1 } }, function(err, messages) {
        if (err) return callback(err);

        // collapse the current set of messages down to relevant commands.
        messages.forEach(function(message) { self.process(message); });

        console.log('command queue after existing messages: ' + JSON.stringify(self.messageQueue));

        self.execute();

        session.onMessage(filter, function(message) {
            self.process(message);

            // if we aren't currently executing anything, kickstart execution.
            if (!self.executing) {
                self.execute();
            }

            callback();
        });

        callback();
    });
};

module.exports = CommandManager;



