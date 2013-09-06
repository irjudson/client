var CommandManager = require('./commandManager')
    , Message = require('./message');

function DroneManager() {
    CommandManager.apply(this, arguments);
}

DroneManager.prototype = Object.create(CommandManager.prototype);
DroneManager.prototype.constructor = DroneManager;

DroneManager.prototype.executeQueue = function(callback) {
    if (!this.device) return callback(new Error('No drone attached to drone manager.'));

    var self = this;
    var responseTo = [];
    this.activeCommands().forEach(function(command) {

        // naive but lets start here.
        this.device[command.body.command]();
        responseTo.push(command.id);
    });

    var message = new Message({
        type: 'switchState',
        response_to: responseTo,
        body: {
            // TODO: reply with current state
        }
    });
    message.send(self.session, callback);
};

DroneManager.prototype.isCommand = function(message) {
    return (message.is('droneCommand'));
};

DroneManager.prototype.isRelevant = function(message) {
    return (message.is('droneCommand') || message.is('droneState')) && (!this.device || message.from === this.device.id || message.to == this.device.id);
};

var obsoletedByMatrix = {
    'takeoff':          ['land'],
    'land':             ['takeoff'],
    'up':               ['land', 'takeoff', 'stop', 'down'],
    'down':             ['land', 'takeoff', 'stop', 'up'],
    'clockwise':        ['land', 'takeoff', 'stop', 'counterClockwise'],
    'counterClockwise': ['land', 'takeoff', 'stop', 'clockwise'],
    'forward':          ['land', 'takeoff', 'stop', 'back'],
    'back':             ['land', 'takeoff', 'stop', 'forward'],
    'left':             ['land', 'takeoff', 'stop', 'right'],
    'right':            ['land', 'takeoff', 'stop', 'left'],
    'stop':             ['takeoff', 'land']
};

DroneManager.prototype.obsoletes = function(downstreamMsg, upstreamMsg) {
    if (CommandManager.obsoletes(downstreamMsg, upstreamMsg)) return true;

    return downstreamMsg.body.command in obsoletedByMatrix[upstreamMsg.body.command] ||
           downstreamMsg.is('droneState') && downstreamMsg.isResponseTo(upstreamMsg);

    // obsoletes if dwnstream obsoletes
    return downstreamMsg.is('droneCommand') || downstreamMsg.is('droneState') && downstreamMsg.isResponseTo(upstreamMsg);
};

module.exports = DroneManager;