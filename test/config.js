var nitrogen = require('../lib');
   
var config = { 
    host: "localhost",
    protocol: "http"
};

config.http_port = process.env.PORT || config.http_port || 3030;
config.store = new nitrogen.Store(config);

module.exports = config;
