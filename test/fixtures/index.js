var config = require('../config'),
    nitrogen = require('../../lib');

var fixtures = {};

var addToFixture = function(fixtureId) {
    return function(err, model) {
        if (err) throw err;
        fixtures[fixtureId] = model;
    };
};

exports.reset = function() {
    var service = new nitrogen.Service(config);
    var camera = new nitrogen.Device({ capabilities: "camera", local_id: "camera" });

    service.connect(camera, function(err, session, camera) {
        if (err) throw err;

        fixtures['camera'] = camera;

        var message = new nitrogen.Message({
	    type: "image",
            body: {
                url: "http://localhost:3030/blobs/1"
            }
	    });

        message.save(session, function(err, messages) {
            messages.forEach(function(message) {
                fixtures['message'] = message;
            });
        });
    });
};

exports.models = fixtures;
