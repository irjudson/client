var fixtures = require('./fixtures');

before(function(done) {
    fixtures.reset();

    setTimeout(function() {
        done();
    }, 500);
});