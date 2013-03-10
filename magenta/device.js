var Principal = require('./principal'),
	request = require('request');

function Device() {
	Principal.apply(this, arguments);
}

Device.prototype = Object.create(Principal.prototype);

module.exports = Device;