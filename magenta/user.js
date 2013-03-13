var Principal = require('./principal'),
    request = require('request');

function User() {
    Principal.apply(this, arguments);

    this.principal_type = "user";
    this.local_id = "user";
}

User.prototype = Object.create(Principal.prototype);

module.exports = User;