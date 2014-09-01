var assert = chai.assert;


describe('Daybed.Model', function() {

    var server;

    beforeEach(function () {
        server = sinon.fakeServer.create();
    });

    afterEach(function () {
        server.restore();
    });

    it("should fetch definition and records from server", function (done) {
        server.respondWith("GET", "/token", '{ "credentials": { "id": 3.14, "key": "abc" } }');
        server.respondWith("GET", "/model/test", '{ "records": [{"status": "done"}], "definition": {"fields": "fff"}}');

        Daybed.startSession('').then(function (session) {
            var model = new Model(session);
            model.load()
              .then(function () {
                assert.equal(model.records()[0].status, 'done');
                assert.equal(model.definition()['fields'], 'fff');
                done();
              });
        });

        server.respond();
    });
});
