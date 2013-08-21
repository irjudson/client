var assert = require('assert')
  , config = require('../config')
  , fixtures = require('../fixtures')
  , nitrogen = require('../../lib')
  , path = require('path');

describe('cameraManager', function() {

    it('should be able to calculate the right amount of history required', function(done) {
        var cameraManager = new nitrogen.CameraManager();
        cameraManager.messageQueue = [
            new nitrogen.Message({
                id: '1',
                type: 'cameraCommand',
                expires: new Date(2050,1,1,0,0,0),
                body: {
                    command: 'motion'
                }
            })
        ];

        assert.equal(cameraManager.historyRequired(), 3);

        cameraManager.messageQueue.push(new nitrogen.Message({
            id: '2',
            type: 'cameraCommand',
            expires: new Date(2050,1,1,0,0,0),
            body: {
                command: 'snapshot'
            }
        }));

        assert.equal(cameraManager.historyRequired(), 3);

        cameraManager.messageQueue = cameraManager.messageQueue.slice(1);
        assert.equal(cameraManager.historyRequired(), 1);

        cameraManager.messageQueue = [];
        assert.equal(cameraManager.historyRequired(), 0);

        done();
    });

    it('should be able to start a CameraManager with a device', function(done) {
        var service = new nitrogen.Service(config);

        var camera = new nitrogen.Device({
            capabilities: "camera",
            nickname: "camera"
        });

        service.connect(camera, function(err, session) {
            var cameraManager = new nitrogen.CameraManager(camera);
            var gotCallback = false;
            cameraManager.start(session, {}, function(err) {
                assert.equal(err, undefined);
                if (!gotCallback) {
                    gotCallback = true;
                    done();
                }
            });
        });
    });

});
