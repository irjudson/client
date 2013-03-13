var Principal = require('./principal'),
	request = require('request');

function Device() {
	Principal.apply(this, arguments);

	this.principal_type = "device";
}

Device.prototype = Object.create(Principal.prototype);

module.exports = Device;