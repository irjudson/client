var assert = require('assert')
  , config = require('../config')
  , fixtures = require('../fixtures')
  , nitrogen = require('../../lib');

describe('heartbeat', function() {

    it('should be able to send a heartbeat', function(done) {
        var service = new nitrogen.Service(config);

        service.create(fixtures.models.camera, function(err, session, principal) {
            session.onMessage({ type: 'heartbeat' }, function(message) {
                if (message.from === session.principal.id) {
                    done();
                }
            });

            setTimeout(function() {
                session.heartbeat.send(function(err) {
                    assert.ifError(err);
                });
            }, 200);
        });
    });

});