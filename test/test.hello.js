var assert = chai.assert;

describe('Hello page', function() {
    var server;
    var sandbox;

    beforeEach(function () {
        server = sinon.fakeServer.create();
        server.autoRespond = true;
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        server.restore();
        sandbox.restore();
    });

    it("should fetch hello from server", function (done) {
        server.respondWith("GET", "/v1/", '{ "version": 1.0 }');

        Daybed.hello('').then(function (data) {
            assert.equal(data.version, 1.0);
            done();
        });
    });

    it("should survive server errors", function (done) {
        server.respondWith("GET", "/v1/", [500, '', 'Server down']);

        sandbox.stub(console, 'warn');
        sandbox.stub(console, 'error');
        Daybed.hello('').catch(function (error) {
            assert.equal(error.message, 'Server down');
            done();
        });
    });
});
