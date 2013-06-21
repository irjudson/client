var assert = require('assert')
  , config = require('../config')
  , fixtures = require('../fixtures')
  ,	nitrogen = require('../../lib');

describe('service object', function() {

    var service = new nitrogen.Service(config);

    var camera = new nitrogen.Device({
        capabilities: ["camera"],
        nickname: "camera"
    });

    var thermometer = new nitrogen.Device({
        capabilities: ["thermometer"],
        nickname: "thermometer"
    });

	it('should be able to connect device', function(done) {
        service.connect(camera, function(err, session) {
            assert.equal(err, null);
            assert.notEqual(session, null);

            session.log.info("i can successfully log too");

            done();
        });
	});

    it('should be able to authenticate user', function(done) {
        service.authenticate(fixtures.models.user, function(err, session, user) {
            assert.ifError(err);
            assert.notEqual(!session, true);
            assert.notEqual(!user, true);

            done();
        });
    });

    it('camera should be able to impersonate itself', function(done) {
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
