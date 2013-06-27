var AuthRequest = require('./authRequest')
  , utils = require('./utils');

/**
 * Message is the core of the Nitrogen framework.  It forms the mechanism that devices and applications communicate
 * over and that the rest of the framework enables.
 *
 * @class Message
 * @namespace nitrogen
 */

function Message(json) {
    this.id = null;
    this.ts = new Date();
    this.body = {};

    for(var key in json) {
        if(json.hasOwnProperty(key)) {
            if (key === 'ts' || key === 'expires')
                this[key] = new Date(Date.parse(json[key]));
            else
                this[key] = json[key];
        }
    }
}

/**
 * Find messages filtered by the passed query and limited to and sorted by the passed options.
 *
 * @method find
 * @async
 * @param {Object} session An open session with a Nitrogen service.
 * @param {Object} query A query filter for the messages you want to find defined using MongoDB query format.
 * @param {Object} options Options for the query.
 *   @param {Number} options.limit The maximum number of results to be returned.
 *   @param {String} options.sort The field that the results should be sorted on.
 *   @param {Number} options.dir The direction that the results should be sorted.
 *   @param {Object} options.skip The number of results that should be skipped before pulling results.
 * @param {Object} callback Callback for the find's execution
 *   @param {Object} callback.err If the find failed, find will callback with the error.
 *   @param {Array} callback.messages The set of messages found with this query.
 */

Message.find = function(session, query, options, callback) {
    if (!session) return callback('no session passed to Message.find');
    if (!callback || typeof(callback) !== 'function') return callback('no callback passed to Message.find.');
    if (!query) query = {};
    if (!options) options = {};

    var messageUrl = session.service.config.messages_endpoint;
    AuthRequest.get(session, {
        url: messageUrl,
        query: query,
        queryOptions: options,
        json: true
    }, function(err, resp, body) {
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

Message.prototype.isFrom = function(principal) {
    return this.from === principal.id;
};

Message.prototype.isResponseTo = function(otherMessage) {
    return this.response_to.indexOf(otherMessage.id) !== -1;
};

Message.prototype.isTo = function(principal) {
    return this.to === principal.id;
};

/**
 * Remove messages specified by query.
 *
 * @method remove
 * @async
 * @param {Object} session An open session with a Nitrogen service.
 * @param {Object} query A query filter for the messages you want to remove.
 * @param {Object} callback Callback to receive the results of the remove operation
 *   @param {Object} callback.err If the operation failed, the error that caused failure, else undefined.
 *   @param {Object} callback.removed The count of messages removed with this operation.
 */

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
    Message.remove(session, { "_id": this.id }, callback || utils.nop);
};

Message.prototype.send = function(session, callback) {
	Message.sendMany(session, [this], callback || utils.nop);
};

Message.sendMany = function(session, messages, callback) {
    if (!session) return callback('session required for Message.send');

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

Message.prototype.expired = function() {
    return this.millisToExpiration() < 0;
};

Message.prototype.millisToExpiration = function() {
    return this.expires - new Date().getTime();
};

Message.prototype.millisToTimestamp = function() {
    return this.ts - new Date().getTime();
};

module.exports = Message;