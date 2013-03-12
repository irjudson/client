var request = require('request');

function Principal(json) {
    this.id = null;

    for(var key in json) {
        if(json.hasOwnProperty(key)) {
            this[key] = json[key];
        }
    }
}

Principal.baseUrl = function(service) {
	return service.config.base_url + "/principals/";
};

Principal.prototype.create = function(session, callback) {
	request.post(Principal.baseUrl(session.service), { json: this },
        function(err, resp, body) {
            if (err) return callback(err, null);
            if (resp.statusCode != 200) return callback("messages post http response: " + resp.statusCode, null);

            console.log('this.id: ' + this.id);
            console.log('body.principal.id: ' + body);

            this.id = body.principal.id;
            return callback(err, this);
        }.bind(this));
};

Principal.prototype.toStoreId = function() {
    return "principal." + this.local_id;
};

module.exports = Principal;