var assert = require('assert'),
	config = require('../config'),
	fs = require('fs'),
	nitrogen = require('../../lib');

describe('blob object', function() {

	var camera = new nitrogen.Device({
        nickname: "camera",
        capabilities: ["camera"]
    });

	it('should be able to save and get a blob', function(done) {
        var service = new nitrogen.Service(config);
        service.connect(camera, function(err, session) {
            assert.equal(err, null);

            var fixture_path = 'test/fixtures/images/image.jpg';
            nitrogen.Blob.fromFile(fixture_path, function(err, blob) {
                if (err) return console.log("failed to build blob from file: " + err);

                blob.save(session, fs.createReadStream(fixture_path), function(err, blob) {
                    if (err) return console.log("failed to save blob: " + err);

                    assert.notEqual(blob.url, undefined);
                    assert.notEqual(blob.link, undefined);
                    assert.equal(blob.url.slice(-(blob.id.length+1)), "/" + blob.id);

                    nitrogen.Blob.get(session, blob.url, function(err, resp, blobData) {
                        assert.ifError(err);
                        assert.equal(resp.statusCode, 200);
                        assert.equal(blobData.length, 29118);
                        done();
                    });
                });
            });
        });
	});
});
