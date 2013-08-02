var async = require('async')
  , Blob = require('./blob')
  , CommandManager = require('./commandManager')
  , fs = require('fs')
  , Message = require('./message')
  , path = require('path');

function CameraManager(camera) {
    this.camera = camera;
    this.history = [];
}

CameraManager.DEFAULT_MOTION_THRESHOLD = 0.03;  // 3% of pixels showing motion.

CameraManager.prototype = Object.create(CommandManager.prototype);
CameraManager.prototype.constructor = CameraManager;

CameraManager.prototype.historyRequired = function() {
    var historyRequired = 0;        
    this.activeCommands().forEach(function(activeCommand) {
        if (activeCommand.body.command === "motion")
            historyRequired = 2;
    });

    return historyRequired;
};

CameraManager.prototype.detectMotion = function(command, callback) {
    callback(false);
};

CameraManager.prototype.onSnapshot = function(err, shot) {
    if (err) {
        this.executing = false;
        return self.session.error('camera snapshot failed with error: ' + err);
    }

    var self = this;
    this.history.push(shot);

    // if we need more snapshots based on the command queue, immediately issue another snapshot.
    var needAnotherSnapshot = false;
    this.activeCommands().forEach(function(command) {
        if (command.body.command == 'motion') needAnotherSnapshot = true;
    });

    if (needAnotherSnapshot) {
        this.camera.snapshot({}, function(err, shot) { self.onSnapshot(err, shot); });
    }

    // walk through the list of commands and see which ones we can satisfy.
    // as we do satisfy them, add them to response_to and incorporate their attributes.

    var attributes = {};
    attributes.response_to = [];

    this.activeCommands().forEach(function(activeCommand) {
        var commandTriggered;
        console.log('activeCommand.body.command: ' + activeCommand.body.command);
        if (activeCommand.body.command == "motion") {
            commandTriggered = function(callback) { console.log('motion command triggered.'); self.detectMotion(activeCommand, callback); };
        } else {
            commandTriggered = function(callback) { callback(true); }
        }

        commandTriggered(function(triggered) {
            if (triggered) {
                attributes.response_to.push(activeCommand.id);

                // allow passing through attributes from commands to message
                if (activeCommand.body.message) {
                    // TODO: need some way to intelligently combine attributes (max 'expires', etc.)
                    for (key in activeCommand.body.message) {
                        attributes[key] = activeCommand.body.message[key];
                    }
                }
            }
        });
    });

    // only send a message if we are able to satisfy at least one command in the queue.
    if (attributes.response_to.length > 0) {
        console.log('sending shot');
        this.sendImage(shot, attributes);
    } else {
        console.log('not sending shot');
    }

    // resize history to match up with requirements.
    var sliceStart = Math.max(0, this.history.length - this.historyRequired());
    for (var i=0; i < sliceStart; i++) {
        fs.unlink(this.history[i].path);
    }
    this.history = this.history.slice(sliceStart);
};

CameraManager.prototype.executeCommand = function() {
    if (!this.camera) return;

    var self = this;
    this.camera.snapshot({}, function(err, shot) { self.onSnapshot(err, shot); });
}

CameraManager.prototype.isRelevant = function(message) {
    return message.is('cameraCommand') || message.is('image');
};

CameraManager.prototype.obsoletes = function(downstreamMsg, upstreamMsg) {
    if (CommandManager.obsoletes(downstreamMsg, upstreamMsg)) return true;

    return downstreamMsg.is('cameraCommand') && downstreamMsg.body.command === "cancel" && downstreamMsg.isResponseTo(upstreamMsg.id) ||
        downstreamMsg.is('image') && downstreamMsg.isResponseTo(upstreamMsg) && upstreamMsg.body.command === "snapshot";
};

CameraManager.prototype.sendImage = function(shot, attributes, callback) {
    var self = this;

    Blob.fromFile(shot.path, function(err, blob) {
        if (err) return callback(err);

        console.log('saving image blob.');

        blob.save(self.session, fs.createReadStream(shot.path), function(err, blob) {
            if (err) return callback(err);

            console.log('created blob with url: ' + blob.url);

            var message = new Message({
                type: blob.message_type,
                link: blob.link,

                body: {
                    url: blob.url
                }
            });

            for (var attribute in attributes) {
                console.log('setting attribute: ' + attribute + ' to ' + attributes[attribute]);
                message[attribute] = attributes[attribute];
            }

            message.send(self.session, function(err, message) {
                if (err) return callback("failed to send message for path: " + shot.path + " :" + err);

                console.log("sent message: " + JSON.stringify(message));
                fs.unlink(shot.path, callback);
            });
        });
    });
};

module.exports = CameraManager;
