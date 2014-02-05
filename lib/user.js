var Principal = require('./principal')
  , request = require('request');
  
/**
 * User is a subclass of principal that houses all user specific principal functionality. 
 *
 * @class User
 * @namespace nitrogen
 */

function User() {
    Principal.apply(this, arguments);

    this.type = 'user';
}

User.prototype = Object.create(Principal.prototype);
User.prototype.constructor = User;

/**
 * Change the password for this user principal as part of this session.
 * 
 * Only the current principal may change their password.  If the current principal is not a device, the request will fail with a 
 * 400 Bad Request.  
 *
 * @method changePassword
 * @async
 * @param {Object} session An open session with a Nitrogen service.
 * @param {String} currentPassword The current password for the user.
 * @param {String} newPassword The new password for the user.
 * @param {Object} callback Callback for the save.
 *   @param {Object} callback.err If the save failed, this will contain the error.
 *   @param {Object} callback.principal The saved principal returned by the service.
 **/

User.prototype.changePassword = function(session, currentPassword, newPassword, callback) {
    var self = this;
    if (!this.is('user')) return callback("principal is not of type user user.  changing password is not possible.");

    this.password = currentPassword;
    this.new_password = newPassword;

    session.post({
        url: session.service.config.principals_endpoint + "/password", 
        json: this 
    }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(resp.statusCode);

        return callback();
    });
};

/**
 * Reset the password for the user principal with this email address.
 *
 * @method resetPassword
 * @async
 * @param {Object} config The headwaiter returned config for the Nitrogen service.
 * @param {String} email The email for the user you'd like to reset the password for.
 * @param {Object} callback Callback for the save.
 *   @param {Object} callback.err If the save failed, this will contain the error.
 *   @param {Object} callback.principal The principal whose password was reset.
 **/

Principal.resetPassword = function(config, email, callback) {
    var self = this;

    request.post({
        url: config.principals_endpoint + "/reset/" + email
    }, function(err, resp, body) {
        if (err) return callback(err);
        if (resp.statusCode != 200) return callback(resp.statusCode);

        if (callback) callback(null, self);
    });
};

module.exports = User;