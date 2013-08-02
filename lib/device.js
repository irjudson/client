var Principal = require('./principal');

function Device() {
	Principal.apply(this, arguments);

	this.type = 'device';
}

Device.prototype = Object.create(Principal.prototype);
Device.prototype.constructor = Device;

module.exports = Device;