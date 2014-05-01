var assert = require('assert')
  ,	config = require('../config')
  , fixtures = require('../fixtures')
  ,	nitrogen = require('../../lib');

describe('principal', function() {
    var service = new nitrogen.Service(config);

    it('find with no query returns all principals', function(done) {
        service.connect(fixtures.models.camera, function(err, session) {
            nitrogen.Principal.find(session, {}, {}, function(err, principals) {
                assert.ifError(err);
                assert.equal(principals.length > 0, true);
                done();
            });
        });
    });

    it('find with device query returns device principals', function(done) {
        service.connect(fixtures.models.camera, function(err, session) {
            nitrogen.Principal.find(session, {
                type: "device"
            }, {
                skip: 0,
                sort: { last_connection: 1 }
            }, function(err, principals) {
                assert.ifError(err);
                assert.equal(principals.length > 0, true);
                assert.equal(principals[0].type, "device");
                assert.notEqual(principals[0].toStoreId, undefined);
                done();
            });
        });
    });

    it('should be able to save principals', function(done) {
        service.connect(fixtures.models.camera, function(err, session, camera) {
            assert(!err);

            camera.name = "camera";
            camera.save(session, function(err, camera) {
                assert.ifError(err);
                assert.equal(camera.name, "camera");
                done();
            });
        });
    });

    it('should be able to remove a principal', function(done) {
        var cameraForDelete = new nitrogen.Device({
            nickname: "deleteCamera"
        });

        service.connect(cameraForDelete, function(err, session, cameraForDelete) {
            cameraForDelete.remove(session, function(err) {
                assert.ifError(err);

                done();
            });
        });
    });

    it('should be able to fetch a single principal', function(done) {
        service.connect(fixtures.models.camera, function(err, session, camera) {
            assert.ifError(err);

            nitrogen.Principal.findById(session, camera.id, function(err, principal) {
                assert.ifError(err);
                assert.equal(principal.id, camera.id);

                done();
            });
        });
    });
});