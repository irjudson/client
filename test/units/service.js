var assert = require('assert'),
	config = require('../config'),
	magenta = require('../../magenta');

describe('service object', function() {

	var camera = new magenta.Device({ capabilities: "camera", local_id: "camera" });

	it('should be able to connect device', function(done) {
		magenta.Service.initialize(config, function(err, service) {
			service.connect(camera, function(err, session) {
				assert.equal(err, null);
				assert.notEqual(session, null);

				done();
			})
		});
	});

});
