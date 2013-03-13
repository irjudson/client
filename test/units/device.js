var assert = require('assert'),
	config = require('../config'),
	magenta = require('../../magenta');

describe('device', function() {

    it('should be able to create a device', function(done) {
        var service = new magenta.Service(config);

        var device = new magenta.Device({ capabilities: "camera",
                                          local_id: "camera" });

        service.register(device, function(err, principal) {
            if (err) return console.log("device create failed: " + err);
            assert.equal(err, null);

            assert.notEqual(principal.id, undefined);

            done();
        });
    });

});