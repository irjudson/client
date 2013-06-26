var Blob = require('./blob')
  , CommandManager = require('./commandManager')
  , fs = require('fs')
  , Message = require('./message');

function CameraManager(cameraDevice) {
    this.cameraDevice = cameraDevice;
}

CameraManager.prototype = Object.create(CommandManager.prototype);

CameraManager.prototype.executeCommand = function() {
    if (!this.cameraDevice) return;

    var self = this;
    this.cameraDevice.snapshot({}, function(err, shot) {
        if (err) {
            self.executing = false;
            return console.log('execute: snapshot execution failed: ' + err);
        }

        var attributes = {};
        attributes.response_to = [];

        self.activeCommands().forEach(function(activeCommand) {
            attributes.response_to.push(activeCommand.id);

            // allow passing through attributes from commands to message
            // TODO: need some way to intelligently combine attributes (max 'expires', etc.)
            if (activeCommand.body.message) {
                for (key in activeCommand.body.message) {
                    attributes[key] = activeCommand.body.message[key];
                }
            }
        });

        self.sendImage(shot, attributes, function(err) {
            self.executing = false;
        });

    });
}

CameraManager.prototype.isRelevant = function(message) {
    return message.is('cameraCommand') || message.is('image');
}

CameraManager.prototype.obsoletes = function(downstreamMsg, upstreamMsg) {
    if (CommandManager.obsoletes(downstreamMsg, upstreamMsg)) return true;

    return downstreamMsg.is('cameraCommand') && downstreamMsg.body.command === "cancel" && downstreamMsg.isResponseTo(upstreamMsg.id) ||
        downstreamMsg.is('image') && downstreamMsg.isResponseTo(upstreamMsg);
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
