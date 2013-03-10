var magenta = require('../magenta'),
    config = null;

if (process.env.NODE_ENV == "production") {
    config = {
        host: "magenta.azurewebsites.net",
        http_port: 80,
        protocol: "http",
    };
} else if (process.env.NODE_ENV == "test") {
    config = {
        host: "localhost",
        http_port: 3050,
        protocol: "http",
    };
} else {
    config = {
        host: "localhost",
        http_port: 3030,
        protocol: "http",
    };
}

console.log(magenta.LocalStore);
config.local_store_path = ".";
config.store = new magenta.LocalStore(config);

// computed properties

config.base_url = config.protocol + "://" + config.host + ":" + config.http_port + "/api/v1";
config.realtime_url = config.base_url + "/realtime";

module.exports = config;