var AuthRequest = require('./authRequest')
  , request = require('request');

function Agent(json) {
    for(var key in json) {
        if(json.hasOwnProperty(key)) {
            this[key] = json[key];
        }
    }
}

Agent.find = function(session, query, callback) {
    if (!session) return callback("session required for find");

    var agentUrl = session.service.config.agents_endpoint;
    AuthRequest.get(session, { url: agentUrl, qs: query, json: true }, function(err, resp, body) {
        if (err) return callback(err);

        var agents = body.agents.map(function(agent) {
            return new Agent(agent);
        });

        callback(null, agents);
    });
};

module.exports = Agent;