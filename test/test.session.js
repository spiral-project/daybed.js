var assert = chai.assert;


describe('Daybed.startSession', function() {

    var server;

    beforeEach(function () {
        server = sinon.fakeServer.create();
    });

    afterEach(function () {
        server.restore();
    });

    it("should create a new token if no credentials", function (done) {
        server.respondWith("POST", "/v1/tokens", '{ "credentials": { "id": 3.14, "key": "abc" } }');

        Daybed.startSession('').then(function (session) {
            assert.equal(session.credentials.id, 3.14);
            done();
        });

        server.respond();
    });

    it("should validate credentials if specified", function (done) {
        server.respondWith("GET", "/v1/token", '{ "credentials": { "id": 3.14, "key": "abc" } }');

        Daybed.startSession('', {
            credentials: {id: 'a', key: 'xyz'},
        }).then(function (session) {
            assert.equal(session.credentials.id, '3.14');
            done();
        });

        server.respond();
    });

    it("should derive the token if specified", function (done) {
        server.respondWith("GET", "/v1/token", '{ "credentials": { "id": 3.14, "key": "abc" } }');

        Daybed.startSession('', {
            token: 'xyz'
        }).then(function (session) {
            assert.equal(session.credentials.algorithm, 'sha256');
            done();
        });

        server.respond();
    });

    it("should derive the token if specified as function", function (done) {
        server.respondWith("GET", "/v1/token", '{ "credentials": { "id": 3.14, "key": "abc" } }');

        Daybed.startSession('', {
            token: function () { return 'xyz'; },
        }).then(function (session) {
            assert.equal(session.credentials.algorithm, 'sha256');
            done();
        });

        server.respond();
    });
});


describe('Daybed.Session', function() {

    var server;
    var session = new Daybed.Session('');

    beforeEach(function () {
        server = sinon.fakeServer.create();
    });

    afterEach(function () {
        server.restore();
    });

    describe('Raw initialization', function() {

        it("should fail if no host is specified", function() {
            assert.throws(function fn() {
                new Daybed.Session();
            }, Error, 'You should provide a host.');
        });

        it("should have undefined credentials if not specified", function() {
            var session = new Daybed.Session('host');
            assert.isUndefined(session.credentials);
        });

        it("should ignore credentials if not well formed", function() {
            var session = new Daybed.Session('host', {credentials: {id: ''}});
            assert.isUndefined(session.credentials);
        });

        it("should have default algorithm", function() {
            var session = new Daybed.Session('host', {credentials: {id: '', key: ''}});
            assert.equal(session.credentials.algorithm, 'sha256');
        });
    });

    describe('Get models', function() {

        it("should fetch models from server", function (done) {
            server.respondWith("GET", "/v1/models", '{ "models": [{ "title": "a" }] }');

            session.getModels().then(function (data) {
                assert.equal(data[0].title, 'a');
                done();
            });
            server.respond();
        });
    });


    describe('Load models', function() {

        it("should fetch single model from server", function (done) {
            server.respondWith("GET", "/v1/models/test", '{ "definition": { "title": "Test" } }');

            session.loadModel('test').then(function (model) {
                assert.equal(model.definition().title, 'Test');
                done();
            });
            server.respond();
        });
    });


    describe('Prefixed models', function() {

        before(function () {
            session.prefix = 'app:';
        });

        after(function () {
            session.prefix = '';
        });

        it("should prefix automatically model ids", function (done) {
            server.respondWith("GET", "/v1/models/app:test", '{ "definition": { "title": "Test" } }');

            session.loadModel('test').then(function (model) {
                assert.equal(model.definition().title, 'Test');
                done();
            });
            server.respond();
        });

        it("should not add prefix if model id is already prefixed", function (done) {
            server.respondWith("GET", "/v1/models/app:test", '{ "definition": { "title": "Test" } }');

            session.loadModel('app:test').then(function (model) {
                assert.equal(model.definition().title, 'Test');
                done();
            });
            server.respond();
        });

    });
});
