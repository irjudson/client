var request = require('request');

function AuthRequest() {
}

AuthRequest.beforeRequest = function(session, options) {
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = "Bearer " + session.accessToken.token;
};

AuthRequest.afterRequest = function(session, err, resp, body, callback) {
    if (resp.statusCode == 401) session.authFailureCallback();
    // TODO: new token assignment to the principal
};

AuthRequest.get = function(session, options, callback) {
    AuthRequest.beforeRequest(session, options);

    return request.get(options, function(err, resp, body) {
        AuthRequest.afterRequest(session, err, resp, body, callback);
        callback(err, resp, body);
    });
};

AuthRequest.post = function(session, options, callback) {
    AuthRequest.beforeRequest(session, options);

    return request.post(options, function(err, resp, body) {
        AuthRequest.afterRequest(session, err, resp, body, callback);
        callback(err, resp, body);
    });
};

module.exports = AuthRequest;