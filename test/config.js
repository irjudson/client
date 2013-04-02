var magenta = require('../magenta'),
    config = null;

if (process.env.NODE_ENV == "production") {
    config = {
        host: "magenta.azurewebsites.net",
        http_port: 80,
        protocol: "http"
    };
} else if (process.env.NODE_ENV == "test") {
    config = {
        host: "localhost",
        http_port: 3050,
        protocol: "http"
    };
} else {
    config = {
        host: "localhost",
        protocol: "http"
    };
}

config.http_port = process.env.PORT || config.http_port || 3030;

config.local_store_path = ".";
config.store = new magenta.FileStore(config);
config.store.clear();

// computed properties

config.base_url = config.protocol + "://" + config.host + ":" + config.http_port + "/api/v1";
config.headwaiter_endpoint = config.base_url + "/headwaiter";

module.exports = config;