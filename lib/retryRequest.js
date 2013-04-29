var request = require('request')
  , retry = require('retry');

function RetryRequest() {
}

RetryRequest.remove = function(options, callback) {
    return RetryRequest.retriedRequest(request.del, options, callback);
};

RetryRequest.get = function(options, callback) {
    return RetryRequest.retriedRequest(request.get, options, callback);
};

RetryRequest.post = function(options, callback) {
    return RetryRequest.retriedRequest(request.post, options, callback);
};

RetryRequest.retriedRequest = function(requestFunction, options, callback) {
    var retryOptions = {
        retries: 5,
        factor: 3,
        minTimeout: 1 * 1000,
        maxTimeout: 10 * 1000,
        randomize: true
    };

    if (options.retryOptions) {
        retryOptions = options.retryOptions;
        delete options.retryOptions;
    }

	var operation = retry.operation(retryOptions);

	return operation.attempt(function(currentAttempt) {
		requestFunction(options, function(err, resp, body) {
			if (operation.retry(err)) return;

			callback(err ? operation.mainError() : null, resp, body);
		});
	})
};

module.exports = RetryRequest;
