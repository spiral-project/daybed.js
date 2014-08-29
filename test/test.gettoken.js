var assert = chai.assert;


describe('Daybed.getToken', function() {

    var server;

    beforeEach(function () {
        server = sinon.fakeServer.create();
    });

    afterEach(function () {
        server.restore();
    });

    describe('Creation', function() {

        it("should fail if no host is specified", function() {
            assert.throws(function fn() {
                Daybed.getToken();
            }, Error, 'You should provide an host.');
        });

        it("should requests a new one if no credentials are specified", function(done) {
            server.respondWith("POST", "/tokens", '{ "credentials": { "id": 3.14 } }');

            Daybed.getToken('').then(function (data) {
                assert.equal(data.credentials.id, 3.14);
                done();
            });
            server.respond();
        });

        it("should requests a new one if credentials are incomplete", function(done) {
            server.respondWith("POST", "/tokens", '{ "credentials": { "id": 3.14 } }');

            Daybed.getToken('', {id: 1}).then(function (data) {
                assert.equal(data.credentials.id, 3.14);
                done();
            });
            server.respond();
        });
    });

    describe('Validation', function() {

        it("should validate credentials on server if specified correctly", function(done) {
            server.respondWith("GET", "/token", '{ "credentials": { "id": 3.14 } }');

            Daybed.getToken('', {id: 3.14, key: 3}).catch(function() {
                console.log(arguments);
            }).then(function (data) {
                assert.equal(data.credentials.id, 3.14);
                done();
            });
            server.respond();
        });
    });
});
