var assert = chai.assert;


describe('Daybed.startSession', function() {

    var server;

    beforeEach(function () {
        server = sinon.fakeServer.create();
        server.autoRespond = true;
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
    });

    it("should validate credentials if specified", function (done) {
        server.respondWith("GET", "/v1/token", '{ "credentials": { "id": 3.14, "key": "abc" } }');

        Daybed.startSession('', {
            credentials: {id: 'a', key: 'xyz'},
        }).then(function (session) {
            assert.equal(session.credentials.id, '3.14');
            done();
        });
    });

    it("should derive the token if specified", function (done) {
        server.respondWith("GET", "/v1/token", '{ "credentials": { "id": 3.14, "key": "abc" } }');

        Daybed.startSession('', {
            token: 'xyz'
        }).then(function (session) {
            assert.equal(session.credentials.algorithm, 'sha256');
            done();
        });
    });

    it("should derive the token if specified as function", function (done) {
        server.respondWith("GET", "/v1/token", '{ "credentials": { "id": 3.14, "key": "abc" } }');

        Daybed.startSession('', {
            token: function () { return 'xyz'; },
        }).then(function (session) {
            assert.equal(session.credentials.algorithm, 'sha256');
            done();
        });
    });
});


describe('Daybed.Session', function() {

    var server;
    var session = new Daybed.Session('');

    beforeEach(function () {
        server = sinon.fakeServer.create();
        server.autoRespond = true;
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
        });
    });


    describe('Save models', function() {

        it("should save permissions if specified", function (done) {
            server.respondWith("PUT", "/v1/models/app:test", '{ "definition": {} }');
            server.respondWith("PATCH", "/v1/models/app:test/permissions", '{ "userid": ["read_all_records"] }');

            var example = {definition: {}, permissions: {"Everyone": ["+ALL"]}};

            session.saveModel('app:test', example)
            .then(function (permissions) {
                assert.deepEqual(permissions['userid'], ['read_all_records']);
                done();
            });
        });

        it("should save all specified models", function (done) {
            server.respondWith("GET", "/v1/models", '{ "models": [] }');
            server.respondWith("PUT", "/v1/models/app:mod1", '{ "title": "a", "definition": {} }');
            server.respondWith("PUT", "/v1/models/app:mod2", '{ "title": "b", "definition": {} }');

            session.saveModels({'app:mod1': {}, 'app:mod2': {}})
            .then(function (responses) {
                assert.deepEqual(responses[0], { "title": "a", "definition": {} });
                assert.deepEqual(responses[1], { "title": "b", "definition": {} });
                done();
            });
        });

        it("should save only those missing", function (done) {
            server.respondWith("GET", "/v1/models", '{ "models": [ {"id": "app:mod1"} ] }');
            server.respondWith("GET", "/v1/models/app:mod1", '{ "title": "a", "definition": {} }');
            server.respondWith("PUT", "/v1/models/app:mod2", '{ "title": "b", "definition": {} }');

            session.saveModels({'app:mod1': {}, 'app:mod2': {}})
            .then(function (responses) {
                assert.deepEqual(responses[0], { "title": "a", "definition": {} });
                assert.deepEqual(responses[1], { "title": "b", "definition": {} });
                done();
            });
        });
    });


    describe('Load models', function() {

        it("should fetch single model from server", function (done) {
            server.respondWith("GET", "/v1/models/test", '{ "definition": { "title": "Test" } }');

            session.loadModel('test').then(function (model) {
                assert.equal(model.definition().title, 'Test');
                done();
            });
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
        });

        it("should not add prefix if model id is already prefixed", function (done) {
            server.respondWith("GET", "/v1/models/app:test", '{ "definition": { "title": "Test" } }');

            session.loadModel('app:test').then(function (model) {
                assert.equal(model.definition().title, 'Test');
                done();
            });
        });

    });


    describe('Save Permissions', function() {

        var example = {"Everyone": ["-ALL"]};

        it("should patch existing permissions by default", function (done) {
            server.respondWith("PATCH", "/v1/models/app:test/permissions", '{ "userid": ["read_all_records"] }');

            session.savePermissions('app:test', example)
            .then(function (permissions) {
                assert.deepEqual(permissions['userid'], ['read_all_records']);
                done();
            });
        });

        it("should replace permissions if option is specified", function (done) {
            server.respondWith("PUT", "/v1/models/app:test/permissions", '{ "userid": ["read_all_records"] }');

            session.savePermissions('app:test', example, {replace: true})
            .then(function (permissions) {
                assert.deepEqual(permissions['userid'], ['read_all_records']);
                done();
            });
        });
    });


    describe('Get records', function() {
        it("should return an object with records attribute");
        it("should accept a list of models");
    });


    describe('Save records', function() {
        it("single patch default");
        it("replace");
        it("many");
        it("should validate only");
    });


    describe('Delete records', function() {
        it("delete single");
        it("delete many");
        it("delete all");
    });

});
