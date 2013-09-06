var assert = require('assert')
  , config = require('../config')
  , fixtures = require('../fixtures')
  , n2 = require('../../lib');

describe('droneManager', function() {

    it('should be able to start a DroneManager with a device', function(done) {
        var service = new n2.Service(config);

        var device = new n2.Device({
            capabilities: "droneCommand",
            nickname: "switch"
        });

        service.connect(device, function(err, session, device) {
            var droneManager = new n2.DroneManager(device);
            droneManager.start(session, { $or: [ { to: device.id }, { from: device.id } ] }, function(err) {
                assert.equal(err, undefined);
                done();
            });
        });
    });

});
