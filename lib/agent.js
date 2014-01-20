/**
 * An agent in Nitrogen is code that runs on the Nitrogen service in the context of a particular principal.
 *
 * @class Agent
 * @namespace nitrogen
 */

function Agent(json) {
    for(var key in json) {
        if(json.hasOwnProperty(key)) {
            this[key] = json[key];
        }
    }
}

/**
 * Create an agent in the Nitrogen service.  If it marked enabled, this will also start the agent on the service.
 *
 * @method create
 * @async
 * @param {Object} session An open session with a Nitrogen service.
 * @param {Object} callback Callback for the create.
 *   @param {Object} callback.err If the create failed, this will contain the error.
 *   @param {Object} callback.principal The created agent returned by the service.
 **/

Agent.prototype.create = function(session, callback) {
    if (this.id) return callback("Agent can't have id to be created.");

    session.post({ url: session.service.config.agents_endpoint, json: this }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(resp.statusCode, null);

        if (callback) callback(null, new Agent(body.agent));
    });
};

/**
 * Find agents filtered by the passed query and limited to and sorted by the passed options.
 *
 * @method find
 * @async
 * @param {Object} session An open session with a Nitrogen service.
 * @param {Object} query A query using MongoDB query format.
 * @param {Object} options Options for the query.
 *   @param {Number} options.limit The maximum number to be returned.
 *   @param {String} options.sort The field that the results should be sorted on.
 *   @param {Number} options.dir The direction that the results should be sorted.
 *   @param {Object} options.skip The number of results that should be skipped before pulling results.
 * @param {Object} callback Callback at completion of execution.
 *   @param {Object} callback.err If the find failed, find will callback with the error.
 *   @param {Array} callback.agents The set found with this query.
 **/

Agent.find = function(session, query, options, callback) {
    if (!session) return callback("session required for find");

    var agentUrl = session.service.config.agents_endpoint;
    session.get({
        url: agentUrl,
        query: query,
        queryOptions: options,
        json: true
    }, function(err, resp, body) {
        if (err) return callback(err);

        var agents = body.agents.map(function(agent) {
            return new Agent(agent);
        });

        callback(null, agents);
    });
};

/**
 * Save this agent to the service.  If the agent is now not enabled and active, the agent will be stopped.
 *
 * @method save
 * @async
 * @param {Object} session An open session with a Nitrogen service.
 * @param {Object} callback Callback for the save.
 *   @param {Object} callback.err If the save failed, this will contain the error.
 *   @param {Object} callback.agent The saved agent returned by the service.
 **/

Agent.prototype.save = function(session, callback) {
    if (!this.id) return callback("Agent must have id to be saved.");

    session.put({ url: session.service.config.agents_endpoint + "/" + this.id, json: this }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(resp.statusCode, null);

        if (callback) callback(null, new Agent(body.agent));
    });
};

module.exports = Agent;