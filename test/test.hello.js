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
        server.respondWith("GET", "/v1/", [500, '', '{ "message": "Server down" }']);

        sandbox.stub(console, 'warn');
        sandbox.stub(console, 'error');

        Daybed.hello('').catch(function (error) {
            assert.equal(error.name, "DaybedError");
            assert.equal(error.status, 500);
            assert.equal(error.message, 'Internal Server Error');
            assert.deepEqual(error.response, {message: 'Server down'});
            done();
        });
        server.respond();
    });

    it("should survive client-side errors", function (done) {
        server.respondWith("GET", "/v1/", '{ "hello": "Daybed" }');

        var failing = sandbox.stub(XMLHttpRequest.prototype, 'setRequestHeader');
        failing.throws();

        Daybed.hello('').catch(function (error) {
            assert.equal(error.name, 'Error');
            assert.equal(error.message, 'Error');
            assert.isUndefined(error.status, 500);
            assert.isUndefined(error.response);
            done();
        });
    });
});
