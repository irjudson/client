var AuthRequest = require('./authRequest');

function Message(json) {
    this.id = null;
    this.ts = new Date();
    this.body = {};

    for(var key in json) {
        if(json.hasOwnProperty(key)) {
            this[key] = json[key];
        }
    }
}

Message.find = function(session, query, callback) {
    if (!session) return callback("session not established");
    if (!query) query = {};

    var messageUrl = session.service.config.messages_endpoint;
    AuthRequest.get(session, { url: messageUrl, query: query, json: true }, function(err, resp, body) {
        if (err) return callback(err);

        var messages = body.messages.map(function(message) {
            return new Message(message);
        });

        callback(null, messages);
    });
};

Message.prototype.is = function(type) {
    return this.type === type;
};

Message.prototype.isResponseTo = function(otherMessage) {
    return this.response_to === otherMessage.id;
}

Message.remove = function(session, query, callback) {
    AuthRequest.remove(session, {
        url: session.service.config.messages_endpoint,
        query: query,
        json: true
    }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(resp.statusCode);

        callback(null, body.removed);
    });
}

Message.prototype.remove = function(session, callback) {
    Message.remove(session, { "_id": this.id }, callback);
};

Message.prototype.save = function(session, callback) {
	Message.saveMany(session, [this], callback);
};

Message.saveMany = function(session, messages, callback) {
    var defaultedMessages = [];
    messages.forEach(function(message) {
        message.from = message.from || session.principal.id;

        defaultedMessages.push(message);
    });

    AuthRequest.post(session, { url: session.service.config.messages_endpoint, json: defaultedMessages }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(resp.statusCode, null);

        var messages = [];
        body.messages.forEach(function(message_json) {
            messages.push(new Message(message_json));
        });

        if (callback) callback(null, messages);
    });
};

module.exports = Message;
