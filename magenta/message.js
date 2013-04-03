var AuthRequest = require('./authRequest')
  , request = require('request');

function Message(json) {
    this.id = null;
    this.timestamp = new Date();
    this.body = {};

    for(var key in json) {
        if(json.hasOwnProperty(key)) {
            this[key] = json[key];
        }
    }
}

Message.findAll = function(session, callback) {
    AuthRequest.get(session, { url: session.service.config.messages_endpoint, json: true }, function(err, resp, body) {
        if (err) return callback(err);

        var messages = body.messages.map(function(message) {
           return new Message(message);
        });

        callback(null, messages);
    });
};

Message.find = function(session, id, callback) {
    var messageUrl = session.service.config.messages_endpoint + "/" + id;
    AuthRequest.get(session, { url: messageUrl, json: true }, function(err, resp, body) {
        if (err) return callback(err);

        callback(null, new Message(body.message));
    });
};

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

    AuthRequest.post(session, { url: session.service.config.messages_endpoint, json: defaultedMessages }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(resp.statusCode, null);

        var messages = [];
        body.messages.forEach(function(message_json) {
            messages.push(new Message(message_json));
        });

        callback(null, messages);
    });
};

module.exports = Message;