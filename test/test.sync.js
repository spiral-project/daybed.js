describe('Records synchronization', function() {

    var server;
    var session = new Daybed.Session('');

    beforeEach(function () {
        server = sinon.fakeServer.create();
        server.autoRespond = true;
    });

    afterEach(function () {
        server.restore();
    });


    it("should push created records", function (done) {
       server.respondWith("GET", "/v1/models/app:test/records", '{ "records": [] }');
       server.respondWith("POST", "/v1/models/app:test/records", '{"id": "abc", "age": 42}');

        session.synchronizeRecords('app:test', [ {age: 42} ])
        .then(function (result) {
            assert.deepEqual(result, {
                created: [ {id: 'abc', age: 42} ],
                deleted: [],
                updated: []
            });
            done();
        });
    });



    describe('Mode push (default)', function () {

        it("should delete missing records", function (done) {
            server.respondWith("GET", "/v1/models/app:test/records", '{ "records": [ {"id": "abc", "age": 42} ] }');
            server.respondWith("DELETE", "/v1/models/app:test/records/abc", '{"id": "abc", "age": 42}');

            session.synchronizeRecords('app:test', [])
            .then(function (result) {
                assert.deepEqual(result, {
                    created: [],
                    deleted: [ {id: 'abc', age: 42} ],
                    updated: []
                });
                done();
            });
        });

        it("should patch only updated records", function (done) {
            server.respondWith("GET", "/v1/models/app:test/records", '{ "records": [ {"id": "abc", "age": 0}, {"id": "xyz", "age": 38}] }');
            server.respondWith("PATCH", "/v1/models/app:test/records/abc", '{"id": "abc", "age": 42}');

            session.synchronizeRecords('app:test', [ {id: 'abc', age: 42}, {id: 'xyz', age: 38} ])
            .then(function (result) {
                assert.deepEqual(result, {
                    created: [],
                    deleted: [],
                    updated: [ {id: 'abc', age: 42} ]
                });
                done();
            });
        });
    });


    describe('Mode pull', function () {

        var options = {mode: 'pull'};

        it("should not update if different");
        it("should not delete if missing");

    });


    it("should support empty list of records", function (done) {
        server.respondWith("GET", "/v1/models/app:test/records", '{ "records": [] }');

        session.synchronizeRecords('app:test', [])
        .then(function (result) {
            assert.deepEqual(result, {
                created: [],
                deleted: [],
                updated: []
            });
            done();
        });
    });

    it("should support multiple models", function (done) {
        server.respondWith("GET", "/v1/models/app:mod1/records", '{ "records": [] }');
        server.respondWith("GET", "/v1/models/app:mod2/records", '{ "records": [] }');
        server.respondWith("POST", "/v1/models/app:mod1/records", '{"id": "abc", "age": 42}');
        server.respondWith("POST", "/v1/models/app:mod2/records", '{"id": "xyz", "age": 38}');

        session.synchronizeRecords({
            'app:mod1': [ {age: 42} ],
            'app:mod2': [ {age: 38} ],
        })
        .then(function (results) {
            assert.deepEqual(results, {
                "app:mod1": {
                    created: [{"id":"abc","age":42}],
                    deleted:[],
                    updated:[]
                },
                "app:mod2": {
                    created: [{"id":"xyz","age":38}],
                    deleted:[],
                    updated:[]
                }
            });
            done();
        });
    });

});