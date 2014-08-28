var assert = chai.assert;


describe('Daybed.getToken', function() {

    var server;

    beforeEach(function () {
        server = sinon.fakeServer.create();
    });

    afterEach(function () {
        server.restore();
    });

    describe('Create by default', function() {

        it("should fail if no host is specified", function() {
            assert.throws(function fn() {
                Daybed.getToken();
            }, Error, 'You should provide an host.');
        });

        it.only("should requests a new one if no credentials are specified", function(done) {
            server.respondWith("POST", "/tokens", '{ "credentials": { "id": 3.14 } }');

            Daybed.getToken('').then(function (data) {
                assert.equal(data.id, 3.14);
                done();
            });
            server.respond();
        });
    });

    describe('Re-use if credentials provided', function() {

        it("should return credentials if those are specified correctly", function(done) {
            Daybed.getToken('', {id:1, key: 3}).then(function (data) {
                assert.equal(data.id, 1);
                done();
            });
        });

        it("should requests a new one if credentials are incomplete", function(done) {
            server.respondWith("POST", "/tokens", '{ "credentials": { "id": 3.14 } }');

            Daybed.getToken('', {id: 1}).then(function (data) {
                assert.equal(data.id, 3.14);
                done();
            });
            server.respond();
        });
    });
});
