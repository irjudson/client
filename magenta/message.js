var BaseModel = require('./base')
  , request = require('request');

function Message(json) {
    BaseModel.apply(this, arguments);

    this.id = null;
    this.timestamp = new Date();
    this.body = {};

    for(var key in json) {
        if(json.hasOwnProperty(key)) {
            this[key] = json[key];
        }
    }
}

Message.prototype = Object.create(BaseModel.prototype);

Message.prototype.save = function(session, callback) {
	this.saveMany(session, [this], callback);
};

Message.prototype.saveMany = function(session, messages, callback) {
    var defaultedMessages = [];
    messages.forEach(function(message) {
        if (!message.from) {
            message.from = session.principal.id;
        }

        defaultedMessages.push(message);
    });

    this.post(session, { url: session.service.config.messages_endpoint, json: defaultedMessages }, function(err, resp, body) {
        if (err) return callback(err, null);
        if (resp.statusCode != 200) return callback("messages post http response: " + resp.statusCode, null);

        var messages = [];
        body.messages.forEach(function(message_json) {
            messages.push(new Message(message_json));
        });

        callback(null, messages);
    });
};

module.exports = Message;