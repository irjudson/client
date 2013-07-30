var assert = require('assert')
  , nitrogen = require('../../lib')
  , path = require('path');

describe('cameraManager', function() {
    it('should detect motion', function(done) {
        var cameraManager = new nitrogen.CameraManager();

        var command = new nitrogen.Message({
            id: '1',
            type: 'cameraCommand',
            expires: new Date(2050,1,1,0,0,0),
            body: {
                command: 'motion'
            }
        });

        cameraManager.history = [
            { path: path.join(__dirname, '../fixtures/images/motion0.jpg') },
            { path: path.join(__dirname, '../fixtures/images/motion2.jpg') }
        ];

        cameraManager.detectMotion(command, function(motion) {
            assert.equal(motion, true);
            done();
        });
    });

    it('should not detect motion with static images', function(done) {
        var cameraManager = new nitrogen.CameraManager();

        var command = new nitrogen.Message({
            id: '1',
            type: 'cameraCommand',
            expires: new Date(2050,1,1,0,0,0),
            body: {
                command: 'motion'
            }
        });

        cameraManager.history = [
            { path: path.join(__dirname, '../fixtures/images/motion0.jpg') },
            { path: path.join(__dirname, '../fixtures/images/motion0.jpg') }
        ];

        cameraManager.detectMotion(command, function(motion) {
            assert.equal(motion, false);
            done();
        });
    });

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

        assert.equal(cameraManager.historyRequired(), 2);

        cameraManager.messageQueue.push(new nitrogen.Message({
            id: '2',
            type: 'cameraCommand',
            expires: new Date(2050,1,1,0,0,0),
            body: {
                command: 'snapshot'
            }
        }));

        assert.equal(cameraManager.historyRequired(), 2);

        cameraManager.messageQueue = cameraManager.messageQueue.slice(1);
        assert.equal(cameraManager.historyRequired(), 0);

        cameraManager.messageQueue = [];
        assert.equal(cameraManager.historyRequired(), 0);

        done();
    });

});
