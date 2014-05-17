var assert = require('assert')
  , config = require('../config')
  , fixtures = require('../fixtures')
  , nitrogen = require('../../lib');

describe('apiKey object', function() {
    var service = new nitrogen.Service(config);

    it('should be able to fetch all api keys for user', function(done) {
        service.authenticate(fixtures.models.user, function(err, session, user) {
            assert(!err);
            assert.notEqual(!session, true);
            assert.notEqual(!user, true);

            nitrogen.ApiKey.index(session, function(err, apiKeys) {
                assert(!err);

                assert(apiKeys.length === 1);
                assert(apiKeys[0].owner === fixtures.models.user.id);

                done();
            });
        });
    });
});