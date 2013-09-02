var CommandManager = require('./commandManager')
  , Message = require('./message');

function SwitchManager() {
    CommandManager.apply(this, arguments);
}

SwitchManager.prototype = Object.create(CommandManager.prototype);
SwitchManager.prototype.constructor = SwitchManager;

SwitchManager.prototype.executeQueue = function(callback) {
    if (!this.device) return callback(new Error('No switch attached to switch manager.'));

    var self = this;

    // only execute the last command chronologically and reply to all the rest.

    var lastCommand = this.lastActiveCommand();
    console.log('lastCommand: ' + JSON.stringify(lastCommand));
    if (lastCommand) {
        this.device.set(lastCommand.body.command.on, function(err, state) {
            var message = new Message({
                type: 'switchState',
                response_to: [ lastCommand.id ],
                body: {
                    on: state
                }
            });

            message.send(self.session, callback);
        });
    }
};

SwitchManager.prototype.isCommand = function(message) {
    return (message.is('switchCommand'));
};

SwitchManager.prototype.isRelevant = function(message) {
    return (message.is('switchCommand') || message.is('switchState')) && (!this.device || message.from === this.device.id || message.to == this.device.id);
};

SwitchManager.prototype.obsoletes = function(downstreamMsg, upstreamMsg) {
    if (CommandManager.obsoletes(downstreamMsg, upstreamMsg)) return true;

    return downstreamMsg.is('switchCommand') || downstreamMsg.is('switchState') && downstreamMsg.isResponseTo(upstreamMsg);
};

module.exports = SwitchManager;