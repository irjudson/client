var async = require('async'),
    request = require('request');

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

Message.prototype.save = function(session, callback) {
	Message.saveMany(session, [this], callback);
};

Message.baseUrl = function(service) {
    return service.config.base_url + "/messages/";
};

Message.saveMany = function(session, messages, callback) {
    var messages_base_url = Message.baseUrl(session.service);

    var defaultedMessages = [];
    messages.forEach(function(message) {
        if (!message.from) {
            message.from = session.principal.id;
        }

        defaultedMessages.push(message);
    });

    request.post(messages_base_url, { json: defaultedMessages }, function(err, resp, body) {
        if (err) return callback(err, null);

        var messages = [];
        body.messages.forEach(function(message_json) {
            messages.push(new Message(message_json));
        });

        callback(null, messages);
    });
};

module.exports = Message;