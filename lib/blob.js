var AuthRequest = require('./authRequest')
  , fs = require('fs');

function Blob() {
    this.id = null;
}

Blob.stringEndsWith = function(s, suffix) {
    return s.indexOf(suffix, s.length - suffix.length) !== -1;
};

Blob.fromFile = function blobFromFile(path, callback) {
	var suffix_mappings = [
		{ suffix: 'jpg', content_type: "image/jpeg", message_type: "image" },
		{ suffix: 'jpeg', content_type: "image/jpeg", message_type: "image" },
        { suffix: 'png', content_type: "image/png", message_type: "image" }
	];

	var blob = new Blob();

	suffix_mappings.forEach(function(suffix_mapping) {
		if (Blob.stringEndsWith(path, suffix_mapping.suffix)) {
			blob.content_type = suffix_mapping.content_type;
			blob.message_type = suffix_mapping.message_type;
		}
	});

    if (!blob.content_type || !blob.message_type) {
        console.log('WARNING: message_type not assigned in Blob.fromFile for path: ' + path);
    }

	fs.stat(path, function(err, stats) {
		if (err) return callback(err);

		blob.timestamp = stats.mtime;
		blob.content_length = stats.size;

		return callback(null, blob);
	});
};

Blob.prototype.save = function(session, stream, callback) {
    if (!session.service.config.blobs_endpoint) return callback("blob endpoint not available on this service");

	var self = this;

	stream.pipe(
        AuthRequest.post(session, { url: session.service.config.blobs_endpoint,
                                    headers: { 'Content-Type': self.content_type,
                                               'Content-Length': self.content_length } }, function (err, resp, body) {
            if (err) return callback(err, null);
            if (resp.statusCode != 200) return callback(resp.statusCode, null);

            try {
                var body_json = JSON.parse(body);
            } catch (err) {
                return callback(err, null);
            }

            self.url = session.service.config.blobs_endpoint + "/" + body_json.blob.id;

            for (var prop in body_json.blob) {
                self[prop] = body_json.blob[prop];
            }

            return callback(null, self);
        })
    );
};

Blob.get = function(session, url, callback) {
    AuthRequest.get(session, { url: url, encoding: null }, callback);
};

module.exports = Blob;
