var assert = require('assert'),
    config = require('../config'),
    nitrogen = require('../../lib');

describe('agent', function() {

    var camera = new nitrogen.Device({ capabilities: "camera", local_id: "camera" });

    it('find with no query returns all agents', function(done) {
        var service = new nitrogen.Service(config);
        service.connect(camera, function(err, session) {
            nitrogen.Agent.find(session, {}, function(err, agents) {
                assert.ifError(err);
                assert.equal(agents.length > 0, true);
                assert.notEqual(agents[0].filter, undefined);
                assert.notEqual(agents[0].action, undefined);
                done();
            });
        });
    });

});