var assert = require('assert'),
	config = require('../config'),
	fs = require('fs'),
	magenta = require('../../magenta');

describe('blob object', function() {

	var camera = new magenta.Device({ local_id: "camera",
									  capabilities: ["camera"] });

	it('should be able to save a blob', function(done) {
        var service = new magenta.Service(config);
        service.connect(camera, function(err, session) {
            assert.equal(err, null);

            var fixture_path = 'test/fixtures/images/image.jpg';
            magenta.Blob.fromFile(fixture_path, function(err, blob) {
                if (err) return console.log("failed to build blob from file: " + err);

                blob.save(session, fs.createReadStream(fixture_path), function(err, blob) {
                    if (err) return console.log("failed to save blob: " + err);

                    assert.notEqual(blob.url, undefined);
                    done();
                });
            });
        });
	});
});