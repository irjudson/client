var assert = require('assert'),
	config = require('../config'),
	magenta = require('../../magenta');

describe('device', function() {

	var camera = new magenta.Device({ capabilities: "camera", local_id: "camera" });

	it('should create a device', function(done) {
        var service = new magenta.Service(config);
        service.connect(camera, function(err, session) {
            var device = new magenta.Device();
            device.manufacturer_id = "opaqueSN";

            device.create(session, function(err, create) {
                if (err) return console.log("device create failed: " + err);
                assert.equal(err, null);

                assert.equal(device.manufacturer_id, "opaqueSN");
                assert.notEqual(device.id, undefined);

                done();
            });
        });
	});

});