var Principal = require('./principal');

function User() {
    Principal.apply(this, arguments);

    this.principal_type = "user";
}

User.prototype = Object.create(Principal.prototype);

module.exports = User;