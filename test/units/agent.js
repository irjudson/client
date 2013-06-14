var assert = require('assert'),
    config = require('../config'),
    nitrogen = require('../../lib');

describe('agent', function() {

    var camera = new nitrogen.Device({
        capabilities: "camera",
        nickname: "camera"
    });

    it('find shouldnt return any agents that arent visible to the principal.', function(done) {
        var service = new nitrogen.Service(config);
        service.connect(camera, function(err, session) {
            nitrogen.Agent.find(session, {}, {}, function(err, agents) {
                assert.ifError(err);
                assert.equal(agents.length > 0, false);
                done();
            });
        });
    });

    it('create and save should work', function(done) {
        var service = new nitrogen.Service(config);
        service.connect(camera, function(err, session) {
            var agent = new nitrogen.Agent({
                execute_as: camera.id,
                action: ";",
                enabled: true
            });

            agent.create(session, function(err, agent) {
                assert.ifError(err);
                assert.notEqual(agent.id, undefined);
                agent.enabled = false;

                agent.save(session, function(err, agent) {
                    assert.ifError(err);
                    assert.equal(agent.enabled, false);
                    done();
                });
            });
        });
    });

});