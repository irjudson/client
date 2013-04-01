var request = require('request');

function BaseModel() {
}

BaseModel.prototype.preRequest = function(session, options) {
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = "Bearer " + session.accessToken.token;
};

BaseModel.prototype.postRequest = function(session, err, resp, body, callback) {
    // TODO: near expiration we can assign a new token to the principal etc. here.
};

BaseModel.prototype.post = function(session, options, callback) {
    this.preRequest(session, options);

    var self=this;
    return request.post(options, function(err, resp, body) {
        self.postRequest(session, err, resp, body, callback);
        callback(err, resp, body);
    });
};

module.exports = BaseModel;