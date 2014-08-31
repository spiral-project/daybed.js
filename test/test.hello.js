var assert = chai.assert;

describe('Hello page', function() {
    var server;

    beforeEach(function () {
        server = sinon.fakeServer.create();
    });

    afterEach(function () {
        server.restore();
    });

    it("should fetch hello from server", function (done) {
        server.respondWith("GET", "/", '{ "version": 1.0 }');

        Daybed.hello('').then(function (data) {
            assert.equal(data.version, 1.0);
            done();
        });
        server.respond();
    });

    it("should survive server errors", function (done) {
        server.respondWith("GET", "/", [500, '', 'Server down']);

        Daybed.hello('').catch(function (error) {
            assert.equal(error.message, 'Server down');
            done();
        });
        server.respond();
    });
});
