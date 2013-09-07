var Message = require('./message');

/**
 * The CommandManager object provides infrastructure for command processing within Nitrogen. Commands are messages that are issued
 * with the intent of changing the state of a principal in the system. The CommandManager's role is to watch that principal's message
 * stream and effect state changes on the device it is managing based on these commands and their context in the stream. The CommandManager
 * is always subclassed into a class that handles a specific type of command. This subclass is responsible for providing a set of functions
 * that define how the message stream should be interpreted and acted on: executeActiveCommands, isRelevant, isCommand, obsoletes. See each
 * function in this class for more information on what an implementation of these functions should provide.
 *
 * An example of how a SwitchManager subclass is used to control a light in a device application looks like this:
 *
 * service.connect(light, function(err, session, light) {
 *     if (err) return console.log('failed to connect light: ' + err);
 *
 *     var switchManager = new n2.SwitchManager(light);
 *     switchManager.start(session, { $or: [ { to: light.id }, { from: light.id } ] }, function(err) {
 *        if (err) return console.log('switchManager failed to start: ' + err);
 *     });
 * });
 *
 * @class CommandManager
 * @namespace nitrogen
 */

function CommandManager(device) {
    this.device = device;
    this.executing = false;
    this.messageQueue = [];
}

/**
 * Return the array of commands that are currently active for this manager.
 *
 * @method activeCommands
 **/

CommandManager.prototype.activeCommands = function() {
    var filtered = [];
    this.messageQueue.forEach(function(message) {
        if (message.millisToTimestamp() <= 0) {
            filtered.push(message);
        }
    });

    return filtered;
};

/**
 * Reduce the current message queue to the set of active commands by obsoleting completed and expired commands. 
 *
 * @method collapse
 * @private
 **/

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
        if (self.isCommand(upstreamMessage)) {
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

/**
 * Executes the currently active command queue.  If the next command's timestamp occurs in the future, setup a timeout to retry then.
 *
 * @method execute
 * @private
 **/

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

        // set up a new execution pass on the command queue.
        setTimeout(function() { self.execute(); }, 0);
    });
};

/**
 * Return the last active command in the message queue as ordered by timestamp.
 *
 * @method lastActiveCommand
 **/

CommandManager.prototype.lastActiveCommand = function() {
    var activeCommands = this.activeCommands();
    return activeCommands.length > 0 ? activeCommands[activeCommands.length - 1] : null;
};

/**
 * Returns true if the given message upstream of the given downstream message is obsoleted by the downstream message.
 * Should be overridden by subclasses to provide command type specific obsoletion logic.  Overrides should start 
 * their implementation by calling this function for base functionality:
 *
 * if (CommandManager.obsoletes(downstreamMsg, upstreamMsg)) return true;
 *
 *
 * @method obsoletes
 **/

CommandManager.obsoletes = function(downstreamMsg, upstreamMsg) {
    if (downstreamMsg.ts < upstreamMsg.ts) return false;
    if (downstreamMsg.expired()) return false;
    if (upstreamMsg.expired()) return true;

    return false;
};

/**
 * Process new message in this principal's message stream:  adds it to the messageQueue, collapses the current message stream,
 * and sets up timeout to handle expiration of this message and the subsequent collapse that should occur.
 *
 * @method process
 * @private
 **/

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

/**
 * Starts command processing on the message stream using the principal's session. It fetches all the current messages, processes them, and then
 * starts execution. It also establishes a subscription to handle new messages and automatically executes them as they are received.
 *
 * @method start
 **/

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
        });

        callback();
    });
};

module.exports = CommandManager;