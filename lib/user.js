var Principal = require('./principal');

function User() {
    Principal.apply(this, arguments);

    this.type = 'user';
}

User.prototype = Object.create(Principal.prototype);
User.prototype.constructor = User;

module.exports = User;