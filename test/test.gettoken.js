describe('Daybed.getToken', function() {

    var server;

    beforeEach(function () {
        server = sinon.fakeServer.create();
        server.autoRespond = true;
    });

    afterEach(function () {
        server.restore();
    });

    describe('Creation', function() {

        it("should fail if no host is specified", function() {
            assert.throws(function fn() {
                Daybed.getToken();
            }, Error, 'You should provide a host.');
        });

        it("should requests a new one if no credentials are specified", function(done) {
            server.respondWith("POST", "/v1/tokens", '{ "credentials": { "id": 3.14 } }');

            Daybed.getToken('').then(function (data) {
                assert.equal(data.credentials.id, 3.14);
                done();
            });
        });

        it("should requests a new one if credentials are incomplete", function(done) {
            server.respondWith("POST", "/v1/tokens", '{ "credentials": { "id": 3.14 } }');

            Daybed.getToken('', {credentials: {id: 1}})
            .then(function (data) {
                assert.equal(data.credentials.id, 3.14);
                done();
            });
        });
    });

    describe('Validation', function() {

        it("should validate credentials on server if specified correctly", function(done) {
            server.respondWith("GET", "/v1/token", '{ "credentials": { "id": 3.14 } }');

            Daybed.getToken('', {credentials: {id: 'abc', key: 'xyz'}})
            .then(function (data) {
                assert.equal(data.credentials.id, 3.14);
                done();
            });
        });
    });
});
