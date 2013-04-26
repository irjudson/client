var assert = require('assert'),
	config = require('../config'),
    fixtures = require('../fixtures'),
	nitrogen = require('../../lib');

describe('message', function() {

    var camera = new nitrogen.Device({ capabilities: "camera", local_id: "camera" });

    it('should save a message', function(done) {
        var service = new nitrogen.Service(config);
        service.connect(camera, function(err, session) {
            assert.equal(err, null);

            var message = new nitrogen.Message();
            message.message_type = "image";
            message.body.url = "http://localhost:3030/blobs/237849732497982";

            session.onMessage(function(message) {
                console.log("message received: " + JSON.stringify(message));
            });

            message.save(session, function(err, messages) {
                assert.equal(err, null);

                messages.forEach(function(message) {
                    assert.equal(message.body.url, "http://localhost:3030/blobs/237849732497982");
                    assert.notEqual(message.id, undefined);
                    assert.equal(message.message_type, "image");

                    // this should fail since session is not admin.  just test making the request successfully
                    // since service itself has tests to cover functionality.
                    message.remove(session, function(err) {
                        assert.equal(!err, false);
                        done();
                    });
                });

            });
        });
    });

    it('has a default constructor', function(done) {
        var service = new nitrogen.Service(config);
        service.connect(camera, function(err, session) {
            var message = new nitrogen.Message();
            assert.notEqual(message.timestamp, null);

            done();
        });
	});

    it('find with no query returns all messages', function(done) {
        var service = new nitrogen.Service(config);
        service.connect(camera, function(err, session) {
            nitrogen.Message.find(session, {}, function(err, messages) {
                assert.ifError(err);
                assert.equal(messages.length > 0, true);
                done();
            });
        });
    });

});