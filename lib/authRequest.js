var request = require('request')
  , RetryRequest = require('./retryRequest');

function AuthRequest() {
}

AuthRequest.beforeRequest = function(session, options) {
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = "Bearer " + session.accessToken.token;

    var prefix = "?";
    if (options.query) {
        var queryString = JSON.stringify(options.query);
        options.url += prefix + "q=" + encodeURIComponent(queryString);
        delete options.query;

        prefix = "";
    }

    if (options.queryOptions) {
        var optionsString = JSON.stringify(options.queryOptions);
        options.url += prefix + "options=" + encodeURIComponent(optionsString);
        delete options.queryOptions;
    }
};

AuthRequest.afterRequest = function(session, err, resp, body, callback) {
    if (resp.statusCode !== 200) err = resp.statusCode;
    if (resp.statusCode === 401) session.authFailureCallback();

    // TODO: new accessToken assignment to the principal near expiration boundaries

    callback(err, resp, body);
};

AuthRequest.get = function(session, options, callback) {
    AuthRequest.beforeRequest(session, options);

    return RetryRequest.get(options, function(err, resp, body) {
        if (err) {
            console.log("error in authenticated request: " + err);
            return callback(err);
        }

        AuthRequest.afterRequest(session, err, resp, body, callback);
    });
};

AuthRequest.post = function(session, options, callback) {
    AuthRequest.beforeRequest(session, options);

    return RetryRequest.post(options, function(err, resp, body) {
        AuthRequest.afterRequest(session, err, resp, body, callback);
    });
};

AuthRequest.remove = function(session, options, callback) {
    AuthRequest.beforeRequest(session, options);
    return RetryRequest.remove(options, function(err, resp, body) {
        AuthRequest.afterRequest(session, err, resp, body, callback);
    });
}

module.exports = AuthRequest;
