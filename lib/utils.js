var nop = function() {
    return this;
};

var queryStringFromObject = function(obj) {
    var str = [];

    for(var p in obj)
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));

    return str.join("&");
};

module.exports = {
    nop: nop,
    queryStringFromObject: queryStringFromObject
};