var assert = require('assert'),
    config = require('../config'),
    nitrogen = require('../../lib');

describe('permission', function() {

    var camera = new nitrogen.Device({
        nickname: "camera"
    });

    it('should be able to create, find, and remove permissions', function(done) {
        var service = new nitrogen.Service(config);
        service.connect(camera, function(err, session) {
            var permission = new nitrogen.Permission({
                issued_to:     camera.id,
                principal_for: camera.id,
                priority:      100000000,
                authorized:    true
            });

            permission.create(session, function(err, permission) {
                assert.ifError(err);
                assert.notEqual(permission.id, undefined);

                nitrogen.Permission.find(session, { issued_to: camera.id }, {}, function(err, permissions) {
                    assert.ifError(err);
                    var startingLength = permissions.length;

                    assert.equal(startingLength, 2);

                    permission.remove(session, function(err) {
                        assert.ifError(err);

                        nitrogen.Permission.find(session, { issued_to: camera.id }, {}, function(err, newPermissions) {
                            assert.ifError(err);
                            var endingLength = newPermissions.length;

                            assert.equal(endingLength, startingLength - 1);
                            done();
                        });
                    });
                });
            });
        });
    });
});
