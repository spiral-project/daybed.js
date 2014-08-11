var assert = chai.assert;


describe('Daybed.Session', function() {
    describe('Initialization', function() {

        it("should have default algorithm", function(done) {
            var session = new Daybed.Session('host', {id: '', key: ''});
            assert.equal(session.credentials.algorithm, 'sha256');
            done();
        });
    });
});
