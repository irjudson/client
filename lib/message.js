var AuthRequest = require('./authRequest');

/**
 * The Message object is the core of the Nitrogen framework.  Applications, devices, and services use Messages to
 * communicate with and issue commands to each other. All messages that don't begin with an unscore are checked against
 * a schema chosen by the messages 'type' and 'schema_version' fields such that a message of a given type is known
 * to conform to a particular structure.   This enables sharing between differing devices and applications.  For custom
 * message types, an application may use an unscore prefix (eg. '_myMessage') with any schema that they'd like.  This
 * supports communication between principals of the same organization over a private schema.  That said, it is strongly
 * encouraged to use standard schemas wherever possible.
 *
 * Messages have a sender principal (referred to as 'from') and a receiver principal (referred to as 'to'). These fields
 * are used to route messages to their receiver.
 *
 * Message types are divided into two main classes: data and commands.  Data messages carry information, typically the
 * output of a device's operation.  For example, a message typed 'image' contains an image url in its body in its 'url'
 * property.
 *
 * The second class of messages are commands. Command messages are sent from one principal to another to request an
 * operation on the receiving principal.  For example, a message of the type 'cameraCommand' contains a command that
 * directs the operation of a camera principal.
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
 **/

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

/**
 * Returns true if the message is of the passed type.
 *
 * @method is
 * @param {String} type Message type to compare against.
 **/

Message.prototype.is = function(type) {
    return this.type === type;
};

/**
 * Returns true if the message is from the passed principal.
 *
 * @method isFrom
 * @param {String} principal Principal to compare against.
 **/

Message.prototype.isFrom = function(principal) {
    return this.from === principal.id;
};

/**
 * Returns true if the message is in response to the passed message.
 *
 * @method isResponseTo
 * @param {String} type Message to compare against.
 **/

Message.prototype.isResponseTo = function(otherMessage) {
    return this.response_to.indexOf(otherMessage.id) !== -1;
};

/**
 * Returns true if the message is of the passed type.
 *
 * @method isTo
 * @param {String} principal Principal to compare against.
 **/

Message.prototype.isTo = function(principal) {
    return this.to === principal.id;
};

/**
 * Removes a set of messages specified by passed filter. Used by the internal service principal to 
 * cleanup expired messages etc.
 *
 * @method remove
 * @async
 * @static
 * @private
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
};

/**
 * Remove this message. Used by the internal service principal for cleanup.
 *
 * @method remove
 * @async
 * @private
 * @param {Object} session An open session with a Nitrogen service.
 * @param {Object} callback Callback to receive the results of the remove operation
 *   @param {Object} callback.err If the operation failed, the error that caused failure, else undefined.
 *   @param {Object} callback.removed The count of messages removed with this operation.
 **/

Message.prototype.remove = function(session, callback) {
    Message.remove(session, { "_id": this.id }, callback || function() {});
};

/**
 * Send this message.
 *
 * @method send
 * @async
 * @param {Object} session An open session with a Nitrogen service.
 * @param {Object} callback Callback at completion of operation
 *   @param {Object} callback.err If the operation failed, the error that caused failure, else null.
 *   @param {Object} callback.message If successful, the sent message.
 **/

Message.prototype.send = function(session, callback) {
    Message.sendMany(session, [this], callback || function() {});
};

/**
 * Send multiple messages.
 *
 * @method sendMany
 * @async
 * @param {Object} session An open session with a Nitrogen service.
 * @param {Array} messages An array of messages to send.
 * @param {Object} callback Callback at completion of operation
 *   @param {Object} callback.err If the operation failed, the error that caused failure, else null.
 *   @param {Object} callback.messages If successful, the array of sent message.
 **/

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
        body.messages.forEach(function(messageJson) {
            messages.push(new Message(messageJson));
        });

        if (callback) callback(null, messages);
    });
};

/**
 * Returns true if the message expired.
 *
 * @method expired
 **/

Message.prototype.expired = function() {
    return this.millisToExpiration() < 0;
};

/**
 * Returns the number of milliseconds before this message expires if the message expired.
 *
 * @method millisToExpiration
 **/

Message.prototype.millisToExpiration = function() {
    return this.expires - new Date().getTime();
};

/**
 * Returns the number of milliseconds before the timestamp for this message.  Used to calculate time to execution for
 * command messages.
 *
 * @method millisToTimestamp
 **/

Message.prototype.millisToTimestamp = function() {
    return this.ts - new Date().getTime();
};

module.exports = Message;
