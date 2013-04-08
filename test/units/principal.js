var assert = require('assert'),
	config = require('../config'),
	magenta = require('../../magenta');

describe('principal', function() {

    var camera = new magenta.Device({ capabilities: "camera", local_id: "camera" });

    it('should be able to create a user', function(done) {
        var user = new magenta.User({ local_id: "user", password: "sEcReT44" });

        user.email = "user" + Math.random() * 1000000 + "@gmail.com";

        assert.equal(user.local_id, "user");
        assert.equal(user.principal_type, "user");

        var service = new magenta.Service(config);

        // clear the principal first so we are not just testing loading from it.
        service.store.set('principal.user', null);
        service.create(user, function(err, session, principal) {
            assert.equal(err, null);

            assert.equal(!principal.id, false);
            assert.equal(!principal.email, false);
            assert.equal(!principal.local_id, false);

            done();
        });

    });

    it('find with no query returns all principals', function(done) {
        var service = new magenta.Service(config);
        service.connect(camera, function(err, session) {
            magenta.Principal.find(session, {}, function(err, principals) {
                assert.ifError(err);
                assert.equal(principals.length > 0, true);
                done();
            });
        });
    });

});