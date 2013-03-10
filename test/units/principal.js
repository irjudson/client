var assert = require('assert'),
	config = require('../config'),
	magenta = require('../../magenta');

describe('principal', function() {

	var camera = new magenta.Device({ capabilities: "camera", local_id: "camera" });

    it('should create a device', function(done) {
    	magenta.Service.initialize(config, function(err, service) {
	    	service.connect(camera, function(err, session) {
				var device = new magenta.Device({ capabilities: "camera",
												  local_id: "camera" });

				device.create(session, function(err, created_device) {
					if (err) return console.log("device create failed: " + err);
					assert.equal(err, null);

					assert.notEqual(created_device.id, undefined);

					done();
				});
			});
		});
	});

});