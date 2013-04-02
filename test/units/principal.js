var assert = require('assert'),
	config = require('../config'),
	magenta = require('../../magenta');

describe('principal', function() {

    it('should be able to create a user', function(done) {
        var user = new magenta.User({ email: "user@gmail.com", password: "sEcReT44" });

        assert.equal(user.local_id, "user");
        assert.equal(user.principal_type, "user");

        var service = new magenta.Service(config);

        // clear the principal first so we are not just testing loading from it.
        service.store.set('principal.user', null);
        service.register(user, function(err, principal) {
            assert.equal(err, null);
            assert.equal(!!principal.id, true);
            assert.equal(!!principal.email, true);
            assert.equal(!!principal.local_id, true);

            done();
        });

    });

});