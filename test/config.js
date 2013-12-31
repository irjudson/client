var nitrogen = require('../lib'),
    Store = require('nitrogen-leveldb-store').Store;
   
var config = { 
    host: "localhost",
    protocol: "http",
    http_port: 3030
};

config.store = new Store(config);

module.exports = config;