var assert = require('assert'),
    config = require('../config'),
    nitrogen = require('../../lib');

describe('permission', function() {

    var camera = new nitrogen.Device({
        capabilities: "camera",
        nickname: "camera"
    });

    it('create should work', function(done) {
        var service = new nitrogen.Service(config);
        service.connect(camera, function(err, session) {
            var permission = new nitrogen.Permission({
                issued_to:     camera.id,
                principal_for: camera.id,
                action:       'send',
                priority:     100000000,
                authorized:   true        
            });

            permission.create(session, function(err, permission) {
                assert.ifError(err);
                assert.notEqual(permission.id, undefined);
                done();
            });
        });
    });
});
