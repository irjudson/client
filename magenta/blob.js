var AuthRequest = require('./authRequest')
  , fs = require('fs');

function Blob() {
    this.id = null;
}

Blob.fromFile = function blobFromFile(path, callback) {
	var suffix_mappings = [
		{suffix: 'jpg', content_type: "image/jpeg", message_type: "image"},
		{suffix: 'jpeg', content_type: "image/jpeg", message_type: "image"}
	];

	var blob = new Blob();

	suffix_mappings.forEach(function(suffix_mapping) {
		if (path.endsWith(suffix_mapping.suffix)) {
			blob.content_type = suffix_mapping.content_type;
			blob.message_type = suffix_mapping.message_type;
		}
	});

	fs.stat(path, function(err, stats) {
		if (err) return callback(err);

		blob.timestamp = stats.mtime;
		blob.content_length = stats.size;

		return callback(null, blob);
	});
};

Blob.prototype.save = function(session, stream, callback) {
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

            self.url = session.service.config.blobs_endpoint + body_json.blob.id;
            self.id = body_json.blob.id;
            self.created_at = body_json.blob.created_at;

            return callback(null, self);
        })
    );
};

module.exports = Blob;