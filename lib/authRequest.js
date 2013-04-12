var request = require('request');

function AuthRequest() {
}

AuthRequest.beforeRequest = function(session, options) {
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = "Bearer " + session.accessToken.token;

    // combine query string items into url since browser-request doesn't support the qs option.
    var prefix = "?";
    var querystring = "";
    for (var key in options.qs) {
        querystring += prefix + key + "=" + options.qs[key];
        prefix = "&";
    }

    options.url += querystring;
    delete options.qs;
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