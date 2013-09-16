var CommandManager = require('./commandManager')
    , Message = require('./message');

var validCommands = [
    'takeoff', 'land', 'up', 'down', 'clockwise', 'counterClockwise', 'forward', 'back', 'left', 'right', 'stop'
];

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

var opposites = {
    'takeoff':          ['land'],
    'land':             ['takeoff'],
    'up':               ['down', 'stop'],
    'down':             ['up', 'stop'],
    'clockwise':        ['counterClockwise', 'stop'],
    'counterClockwise': ['clockwise', 'stop'],
    'forward':          ['back', 'stop'],
    'back':             ['forward', 'stop'],
    'left':             ['right', 'stop'],
    'right':            ['left', 'stop'],
    'stop':             ['down', 'up', 'counterClockwise', 'clockwise', 'back', 'forward', 'right', 'left']
};

function DroneManager() {
    CommandManager.apply(this, arguments);

    var self = this;
    this.droneState = {};
    validCommands.forEach(function(command) {
        self.droneState[command] = 0.0;
    });
}

DroneManager.prototype = Object.create(CommandManager.prototype);
DroneManager.prototype.constructor = DroneManager;

DroneManager.prototype.executeQueue = function(callback) {
    if (!this.device) return callback(new Error('No drone attached to drone manager.'));

    var self = this;
    var responseTo = [];

    // execute active commands in order.
    this.activeCommands().forEach(function(command) {
        //if (!(command.body.command in validCommands)) return console.log('command not valid.');

        if (command.body.speed !== self.droneState[command.body.command]) {
            self.device[command.body.command](command.body.speed);

            self.droneState[command.body.command] = command.body.speed;
            opposites[command.body.command].forEach(function(key) {
                self.droneState[key] = 0.0;
            });

            console.log('pushing ' + command.id);
            responseTo.push(command.id);
        }
    });

    var message = new Message({
        type: 'droneState',
        response_to: responseTo,
        body: {
            state : this.droneState
        }
    });

    console.log('new drone state');
    console.dir(this.droneState);

    message.send(self.session, callback);
};

DroneManager.prototype.isCommand = function(message) {
    return (message.is('droneCommand'));
};

DroneManager.prototype.isRelevant = function(message) {
    return message.is('droneCommand') || message.is('droneState');
};

DroneManager.prototype.obsoletes = function(downstreamMsg, upstreamMsg) {
    if (CommandManager.obsoletes(downstreamMsg, upstreamMsg)) return true;

    return downstreamMsg.body.command in obsoletedByMatrix[upstreamMsg.body.command] ||
           downstreamMsg.is('droneState') && downstreamMsg.isResponseTo(upstreamMsg);
};

module.exports = DroneManager;
