var assert = require('assert')
  , config = require('../config')
  , nitrogen = require('../../lib');

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
        nickname: "cameraFixture",
        tags: ["executes:cameraCommand"]
    });

    service.connect(camera, function(err, session, camera) {
        if (err) throw err;

        console.dir(camera);
        assert(camera.tags.length === 1);

        fixtures.camera = camera;

        var message = new nitrogen.Message({
        type: "image",
            body: {
                url: "http://localhost:3030/blobs/1"
            }
        });

        message.send(session, function(err, messages) {
            if (err) throw err;

            messages.forEach(function(message) {
                fixtures.message = message;
            });
        });
    });

    var user = new nitrogen.User({
        nickname: 'userFixture',
        name: "John Doe",
        email: 'test' + Math.random() + '@domain.com',
        password: 'foobar123'
    });

    service.create(user, function(err, session, user) {
        assert(!err);

        fixtures.user = user;
    });
};

exports.models = fixtures;
