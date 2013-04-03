var config = require('../config'),
    magenta = require('../../magenta');

var fixtures = {};

var addToFixture = function(fixtureId) {
    return function(err, model) {
        if (err) throw err;
        fixtures[fixtureId] = model;
    };
};

exports.reset = function() {
    var service = new magenta.Service(config);
    var camera = new magenta.Device({ capabilities: "camera", local_id: "camera" });

    service.connect(camera, function(err, session) {
        var message = new magenta.Message();
        message.message_type = "image";
        message.body.url = "http://localhost:3030/blobs/1";

        message.save(session, function(err, messages) {
            messages.forEach(function(message) {
                fixtures['message'] = message;
            });
        });
    });
};

exports.models = fixtures;