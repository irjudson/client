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
    service.store.clear();
    
    var camera = new nitrogen.Device({
        capabilities: "cameraCommand",
        nickname: "camera"
    });

    service.connect(camera, function(err, session, camera) {
        if (err) throw err;

        fixtures.camera = camera;

        var message = new nitrogen.Message({
        type: "image",
            body: {
                url: "http://localhost:3030/blobs/1"
            }
        });

        message.send(session, function(err, messages) {
            messages.forEach(function(message) {
                fixtures.message = message;
            });
        });
    });

    var user = new nitrogen.Device({
        nickname: 'user',
        email: 'test@domain.com',
        password: 'foobar123'
    });

    service.create(user, function(err, session, user) {
        fixtures.user = user;
    });
};

exports.models = fixtures;
