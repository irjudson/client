var assert = require('assert')
  ,	config = require('../config')
  ,	nitrogen = require('../../lib');

describe('device', function() {

    it('should be able to create a device', function(done) {
        var service = new nitrogen.Service(config);

        var device = new nitrogen.Device({
            capabilities: "camera",
            nickname: "camera"
        });

        service.create(device, function(err, session, principal) {
            assert.ifError(err);

            assert.equal(!principal.id, false);
            assert.equal(!principal.nickname, false);

            done();
        });
    });

});