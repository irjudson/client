var request = require('request');

function AuthRequest() {
}

AuthRequest.preRequest = function(session, options) {
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = "Bearer " + session.accessToken.token;
};

AuthRequest.postRequest = function(session, err, resp, body, callback) {
    // TODO: handle authorization failure
    // TODO: new token assignment to the principal
};

AuthRequest.get = function(session, options, callback) {
    AuthRequest.preRequest(session, options);

    return request.get(options, function(err, resp, body) {
        AuthRequest.postRequest(session, err, resp, body, callback);
        callback(err, resp, body);
    });
};

AuthRequest.post = function(session, options, callback) {
    AuthRequest.preRequest(session, options);

    return request.post(options, function(err, resp, body) {
        AuthRequest.postRequest(session, err, resp, body, callback);
        callback(err, resp, body);
    });
};

module.exports = AuthRequest;