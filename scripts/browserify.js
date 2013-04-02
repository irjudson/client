var browserify = require('browserify');
var b = browserify();
b.require('../node_modules/browser-request/dist/browser/request.js', {expose: 'request'});

var request = require('request');

window.Buffer = require('buffer').Buffer;
window.magenta = require('../magenta');
