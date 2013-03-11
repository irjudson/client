var assert = require('assert'),
	config = require('../config'),
	magenta = require('../../magenta');

describe('message', function() {

	var camera = new magenta.Device({ capabilities: "camera", local_id: "camera" });

    it('should save a message', function(done) {
        var service = new magenta.Service(config);
        service.connect(camera, function(err, session) {
            var message = new magenta.Message();
            message.message_type = "image";
            message.body.url = "http://localhost:3030/blobs/237849732497982";

            message.save(session, function(err, messages) {
                assert.equal(err, null);

                messages.forEach(function(message) {
                    assert.equal(message.body.url, "http://localhost:3030/blobs/237849732497982");
                    assert.notEqual(message.id, undefined);
                    assert.equal(message.message_type, "image");
                });

                done();
            });
        });
    });

    it('has a default Message contructor', function(done) {
        var service = new magenta.Service(config);
        service.connect(camera, function(err, session) {
            var message = new magenta.Message();
            assert.notEqual(message.timestamp, null);

            done();
        });
	});
});