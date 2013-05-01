var assert = require('assert'),
	config = require('../config'),
	nitrogen = require('../../lib');

describe('principal', function() {

    var camera = new nitrogen.Device({ capabilities: "camera", local_id: "camera" });

    it('should be able to create a user', function(done) {
        var user = new nitrogen.User({ local_id: "user", password: "sEcReT44" });

        user.email = "user" + Math.random() * 1000000 + "@gmail.com";

        assert.equal(user.local_id, "user");
        assert.equal(user.principal_type, "user");

        var service = new nitrogen.Service(config);

        // clear the principal first so we are not just testing loading from it.
        service.store.set('principal.user', null);
        service.create(user, function(err, session, principal) {
            assert.equal(err, null);

            assert.equal(!principal.id, false);
            assert.equal(!principal.email, false);
            assert.equal(!principal.local_id, false);

            session.clearCredentials();

            assert.equal(session.service.store.get(session.principal.toStoreId()), null);

            done();
        });

    });

    it('find with no query returns all principals', function(done) {
        var service = new nitrogen.Service(config);
        service.connect(camera, function(err, session) {
            nitrogen.Principal.find(session, {}, function(err, principals) {
                assert.ifError(err);
                assert.equal(principals.length > 0, true);
                done();
            });
        });
    });

    it('find with device query returns device principals', function(done) {
        var service = new nitrogen.Service(config);
        service.connect(camera, function(err, session) {
            nitrogen.Principal.find(session, { principal_type: "device" }, function(err, principals) {
                assert.ifError(err);
                assert.equal(principals.length > 0, true);
                assert.equal(principals[0].principal_type, "device");
                assert.notEqual(principals[0].toStoreId, undefined);
                done();
            });
        });
    });

});