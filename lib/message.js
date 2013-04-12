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

Message.find = function(session, query, callback) {
    if (!session) return callback("session not established");

    var messageUrl = session.service.config.messages_endpoint;
    AuthRequest.get(session, { url: messageUrl, qs: query, json: true }, function(err, resp, body) {
        if (err) return callback(err);

        var messages = body.messages.map(function(message) {
            return new Message(message);
        });

        callback(null, messages);
    });
};

Message.prototype.save = function(session, callback) {
	Message.saveMany(session, [this], callback);
};

Message.saveMany = function(session, messages, callback) {
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