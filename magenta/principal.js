var request = require('request');

function Principal(json) {
    this.id = null;

    for(var key in json) {
        if(json.hasOwnProperty(key)) {
            this[key] = json[key];
        }
    }
}

Principal.baseUrl = function(config) {
	return config.base_url + "/principals/";
};

Principal.prototype.create = function(config, callback) {
    var self=this;

	request.post({url: Principal.baseUrl(config), json: self }, function(err, resp, body) {

        if (err) return callback(err, null);
        if (resp.statusCode != 200) return callback("messages post http response: " + resp.statusCode, null);

        self.id = body.principal.id;
        return callback(err, self);
    });
};

Principal.prototype.toStoreId = function() {
    return "principal." + this.local_id;
};

module.exports = Principal;