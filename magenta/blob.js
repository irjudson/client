var fs = require('fs'),
	request = require('request');

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

Blob.baseUrl = function(service) {
    return service.config.base_url + "/blobs/";
};

Blob.prototype.save = function(session, stream, callback) {
	var that = this;

	var blob_base_url = Blob.baseUrl(session.service);

	stream.
		pipe(
			request.post(blob_base_url,
				{ headers: { 'Content-Type': that.content_type,
							 'Content-Length': that.content_length } },
				function (err, resp, body) {
			      if (err) return callback(err, null);
	              if (resp.statusCode != 200) return callback("blob post http response: " + resp.statusCode, null);

  				  try {
  			          var body_json = JSON.parse(body);
				  } catch (err) {
				  	  return callback(err, null);
				  }

			      that.url = blob_base_url + body_json.blob.id;
			      that.id = body_json.blob.id;
			      that.created_at = body_json.blob.created_at;

				  return callback(null, that);
				}
			)
		);
};

module.exports = Blob;