var assert = require('assert')
  , config = require('../config')
  , fixtures = require('../fixtures')
  ,	nitrogen = require('../../lib');

describe('service object', function() {

    var camera = new nitrogen.Device({
        capabilities: ["camera"],
        nickname: "camera"
    });
    var thermometer = new nitrogen.Device({
        capabilities: ["thermometer"],
        nickname: "thermometer"
    });

	it('should be able to connect device', function(done) {
        var service = new nitrogen.Service(config);
        service.connect(camera, function(err, session) {
            assert.equal(err, null);
            assert.notEqual(session, null);

            session.log.info("i can successfully log too");

            done();
        });
	});

    it('camera should be able to impersonate itself', function(done) {
        var service = new nitrogen.Service(config);
        service.connect(fixtures.models.camera, function(err, session, cameraPrincipal) {
            assert.equal(err, null);
            assert.notEqual(session, null);

            session.impersonate(cameraPrincipal.id, function(err, impersonationSession) {
                assert.equal(err, null);
                assert.notEqual(impersonationSession, null);

                done();
            });
        });
    });

    it('thermometer should be not be able to impersonate the camera', function(done) {
        var service = new nitrogen.Service(config);
        service.connect(thermometer, function(err, session, thermometer) {
            assert.equal(err, null);
            assert.notEqual(session, null);

            session.impersonate(fixtures.models.camera.id, function(err, impersonationSession) {
                assert.equal(err, 401);

                done();
            });
        });
    });

});
