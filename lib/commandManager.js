function CommandManager() {
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
        if (self.isRelevant(message)) relevantMessages.push(message);
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

    console.log('collapse: final collapsedMessages: ' + JSON.stringify(collapsedMessages));
    this.messageQueue = collapsedMessages;

    this.execute();
};

CommandManager.prototype.execute = function() {
    console.log('execute: executing: ' + this.messageQueue.length + ': ' + JSON.stringify(this.messageQueue));

    var self = this;

    if (this.paused || this.executing) return console.log('execute: command execution in progress, skipping.');
    if (!this.messageQueue || this.messageQueue.length === 0) return console.log('execute: no messages in messageQueue, skipping execute');

    var msToExecute = this.messageQueue[0].millisToTimestamp();
    if (msToExecute > 0) {
        console.log('execute: top message occurs in the future, setting timeout.');
        return setTimeout(function() { self.execute(); }, msToExecute);
    }

    this.executing = true;
    this.executeCommand();

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

CommandManager.prototype.pause = function() {
    this.paused = true;
};

CommandManager.prototype.process = function(message) {
    // message could cancel a previous command, be a new command, or be a response to a previous command.
    // so add it and then collapse the command queue.
    this.messageQueue.push(message);
    this.collapse();

    var self = this;

    var nextExecute = Math.max(message.millisToTimestamp(), 0);
    console.log('process: setting execute timeout of: ' + nextExecute);
    setTimeout(function() { self.execute(); }, nextExecute);

    if (message.expires) {
        var nextExpiration = Math.max(message.millisToExpiration(), 0);

        console.log('process: setting expiration timeout of: ' + nextExpiration);
        setTimeout(function() { self.collapse(); }, nextExpiration);
    }
};

CommandManager.prototype.resume = function() {
    this.paused = false;
    this.execute();
};

CommandManager.prototype.sortQueue = function() {
    this.messageQueue.sort(function(a,b) {
        return a.ts - b.ts;
    });
};

CommandManager.prototype.start = function(messages) {
    this.pause();

    console.log('starting camera manager: ' + messages.length + ' existing messages.');
    this.messageQueue = messages;
    this.collapse();
    console.log('after collapse we have ' + this.messageQueue.length + ' messages in queue.');

    this.resume();
};

module.exports = CommandManager;



