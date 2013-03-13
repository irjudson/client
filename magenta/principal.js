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

	request.post(Principal.baseUrl(config), { json: this }, function(err, resp, body) {

        if (err) return callback(err, null);
        if (resp.statusCode != 200) return callback("messages post http response: " + resp.statusCode, null);

        this.id = body.principal.id;
        return callback(err, this);
    }.bind(this));
};

Principal.prototype.toStoreId = function() {
    return "principal." + this.local_id;
};

module.exports = Principal;