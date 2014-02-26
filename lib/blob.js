var fs = require('fs');

/**
 * A Blob represents a binary data object that is stored with the Nitrogen service. 
 *
 * @class Blob
 * @namespace nitrogen
 */

function Blob() {
    this.id = null;
}

Blob.stringEndsWith = function(s, suffix) {
    return s.indexOf(suffix, s.length - suffix.length) !== -1;
};

/**
 * Loads the metadata for a blob from a file: its timestamp, content type, and content length.
 *
 * @method fromFile
 * @async
 * @param {String} path The path to load this blob from.
 * @param {Function} callback Callback function of the form f(err, blob).
 **/

Blob.fromFile = function(path, callback) {
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

/**
 * Saves the blob to the Nitrogen service.
 *
 * @method save
 * @async
 * @param {Object} session An open session with a Nitrogen service.
 * @param {Object} stream A stream with the contents of the blob.
 * @param {Function} callback Callback function of the form f(err, blob).
 **/

Blob.prototype.save = function(session, stream, callback) {
    if (!session.service.config.blobs_endpoint) return callback("blob endpoint not available on this service");

    var self = this;

    stream.pipe(
        session.post({ url: session.service.config.blobs_endpoint,
                            headers: { 'Content-Type': self.content_type,
                                       'Content-Length': self.content_length } }, function (err, resp, body) {
            if (err) return callback(err);
            if (resp.statusCode != 200) return callback(resp.statusCode);

            var blobJSON = JSON.parse(body);
            self.updateAttributes(blobJSON.blob);

            return callback(null, self);
        })
    );
};

/**
 * Fetches a blob from the Nitrogen service.
 *
 * @method get
 * @async
 * @param {Object} session An open session with a Nitrogen service.
 * @param {Object} url The url for the blob.
 * @param {Function} callback Callback function of the form f(err, httpResponse, blobData).
 **/

Blob.get = function(session, url, callback) {
    session.get({ url: url, encoding: null }, callback);
};

Blob.prototype.updateAttributes = function(json) {
    for(var key in json) {
        if(json.hasOwnProperty(key)) {
            this[key] = json[key];
        }
    }
};

module.exports = Blob;