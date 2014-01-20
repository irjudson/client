var assert = require('assert')
  , config = require('../config')
  , fixtures = require('../fixtures')
  , nitrogen = require('../../lib');

describe('session', function() {

    it('receiving a set-access-token header should update principal and session access token', function(done) {
        var resp = {
            headers: {
                "x-n2-set-access-token": JSON.stringify({ 
                    token: 'rwvrVSVPKRMwdd115FSW8kRbgxcv1mEkhwgFQ2Aqn7iRbaqPNqAEMNbyomd6fWKYVbXeHEH9mEDJqlxYP+QlQw==',
                    expires_at: new Date(2050, 1, 1),
                    created_at: new Date(),
                    id: '5250453b83dce2433d000008'
                })
            }
        };

        var service = new nitrogen.Service(config);

        service.connect(fixtures.models.camera, function(err, session) {
            session.accessToken.token = 'notupdated';
            session.principal.accessToken.token = 'notupdated';

            session.afterRequest(null, resp, null, function(err, resp, body) {
                assert.notEqual(session.accessToken.token, 'notupdated');
                assert.notEqual(session.principal.accessToken.token, 'notupdated');

                done();
            });
        });
    });

});
