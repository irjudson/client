var async = require('async')
  , Blob = require('./blob')
  , CommandManager = require('./commandManager')
  , fs = require('fs')
  , Message = require('./message')
  , path = require('path');

function CameraManager(camera) {
    CommandManager.apply(this, arguments);

    this.camera = camera;
    this.history = [];
}

CameraManager.prototype = Object.create(CommandManager.prototype);
CameraManager.prototype.constructor = CameraManager;

CameraManager.prototype.historyRequired = function() {
    var historyRequired = 0;
    this.activeCommands().forEach(function(activeCommand) {
        var cmd = activeCommand.body.command;

        if (cmd === "snapshot")
            historyRequired = Math.max(1, historyRequired);
        else if (cmd === "motion")
            historyRequired = 3;
    });

    return historyRequired;
};

CameraManager.prototype.detectMotion = function(command, callback) {
    callback(false);
};

CameraManager.prototype.executeQueue = function(callback) {
    if (!this.camera) return callback(new Error('no camera attached to camera manager.'));

    // if there is a queue, for a camera manager that means there is something to do.

    var self = this;
    var messagesGenerated = [];

    this.camera.snapshot({}, function(err, shot) {
        if (err) return callback('camera snapshot failed with error: ' + err);

        self.history.push(shot);

        // walk through the list of commands and see which ones we can satisfy.
        // as we do satisfy them, add them to response_to and incorporate their attributes.

        var attributes = {};
        attributes.response_to = [];

        self.activeCommands().forEach(function(activeCommand) {
            var testCommandTriggered;
            if (activeCommand.body.command == "motion") {
                testCommandTriggered = function(cb) { self.detectMotion(activeCommand, cb); };
            } else if (activeCommand.body.command == "snapshot") {
                testCommandTriggered = function(cb) { cb(true); }
            }

            testCommandTriggered(function(triggered) {
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
            self.sendImage(shot, attributes, function(err, message) {
                if (err) return;

                self.process(message);
                self.resizeHistory();
                callback();
            });
        } else {
            self.resizeHistory();
            callback();
        }
    });
}

CameraManager.prototype.isRelevant = function(message) {
    return (message.is('cameraCommand') || message.is('image')) && (message.from === this.camera.id || message.to == this.camera.id);
};

CameraManager.prototype.obsoletes = function(downstreamMsg, upstreamMsg) {
    if (CommandManager.obsoletes(downstreamMsg, upstreamMsg)) return true;

    return downstreamMsg.is('cameraCommand') && downstreamMsg.body.command === "cancel" && downstreamMsg.isResponseTo(upstreamMsg.id) ||
        downstreamMsg.is('image') && downstreamMsg.isResponseTo(upstreamMsg) && upstreamMsg.body.command === "snapshot";
};

CameraManager.prototype.resizeHistory = function() {
    // resize history to match up with requirements.

    var sliceStart = Math.max(0, this.history.length - this.historyRequired());
    for (var i=0; i < sliceStart; i++) {
        fs.unlink(this.history[i].path);
    }
    this.history = this.history.slice(sliceStart);
};

CameraManager.prototype.sendImage = function(shot, attributes, callback) {
    var self = this;

    Blob.fromFile(shot.path, function(err, blob) {
        if (err) return callback(err);

        blob.save(self.session, fs.createReadStream(shot.path), function(err, blob) {
            if (err) return callback(err);

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

                console.log("sent image message: " + JSON.stringify(message));

                callback(null, new Message(message));
            });
        });
    });
};

module.exports = CameraManager;
