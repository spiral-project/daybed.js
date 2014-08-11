var assert = chai.assert;


describe('Daybed.Session', function() {

    describe('Initialization', function() {

        it("should fail if no host is specified", function() {
            assert.throws(function fn() {
                new Daybed.Session();
            }, Error, 'You should provide an host.');
        });

        it("should have undefined credentials if not specified", function() {
            var session = new Daybed.Session('host');
            assert.isUndefined(session.credentials);
        });

        it("should ignore credentials if not well formed", function() {
            var session = new Daybed.Session('host', {id: ''});
            assert.isUndefined(session.credentials);
        });

        it("should have default algorithm", function() {
            var session = new Daybed.Session('host', {id: '', key: ''});
            assert.equal(session.credentials.algorithm, 'sha256');
        });
    });

    describe('Hello page', function() {

        var server;
        var session = new Daybed.Session('');

        beforeEach(function () {
            server = sinon.fakeServer.create();
        });

        afterEach(function () {
            server.restore();
        });

        it("should fetch hello from server", function (done) {
            server.respondWith("GET", "/", '{ "version": 1.0 }');

            session.hello().then(function (data) {
                assert.equal(data.version, 1.0);
                done();
            });
            server.respond();
        });

        it("should survive server errors", function (done) {
            server.respondWith("GET", "/", [500, '', 'Server down']);

            session.hello().catch(function (error) {
                assert.equal(error.message, 'Server down');
                done();
            });
            server.respond();
        });
    });
});
