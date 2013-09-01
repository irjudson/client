var assert = require('assert')
  , config = require('../config')
  , fixtures = require('../fixtures')
  , n2 = require('../../lib');

describe('switchManager', function() {

    it('should be able to start a SwitchManager with a device', function(done) {
        var service = new n2.Service(config);

        var switchDevice = new n2.Device({
            capabilities: "switchCommand",
            nickname: "switch"
        });

        service.connect(switchDevice, function(err, session) {
            var switchManager = new n2.SwitchManager(switchDevice);
            switchManager.start(session, { $or: [ { to: switchDevice.id }, { from: switchDevice.id } ] }, function(err) {
                assert.equal(err, undefined);
                done();
            });
        });
    });

});
