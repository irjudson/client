var AuthRequest = require('./authRequest');

function Agent(json) {
    for(var key in json) {
        if(json.hasOwnProperty(key)) {
            this[key] = json[key];
        }
    }
}

Agent.prototype.create = function(session, callback) {
    if (this.id) return callback("Agent can't have id to be created.");

    AuthRequest.post(session, { url: session.service.config.agents_endpoint, json: this }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(resp.statusCode, null);

        if (callback) callback(null, new Agent(body.agent));
    });
};

Agent.find = function(session, query, callback) {
    if (!session) return callback("session required for find");

    var agentUrl = session.service.config.agents_endpoint;
    AuthRequest.get(session, { url: agentUrl, query: query, json: true }, function(err, resp, body) {
        if (err) return callback(err);

        var agents = body.agents.map(function(agent) {
            return new Agent(agent);
        });

        callback(null, agents);
    });
};

Agent.prototype.save = function(session, callback) {
    if (!this.id) return callback("Agent must have id to be saved.");

    AuthRequest.put(session, { url: session.service.config.agents_endpoint + "/" + this.id, json: this }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(resp.statusCode, null);

        if (callback) callback(null, new Agent(body.agent));
    });
};

module.exports = Agent;
