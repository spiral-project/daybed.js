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
        server.respondWith("GET", "/token", '{ "credentials": { "id": "abc", "key": "xyz" } }');
        server.respondWith("PUT", "/models/test", '{ "id": "test", "records": [{"status": "done"}], "definition": {"fields": "fff"}}');

        Daybed.startSession('', {token: "abc"}).then(function (session) {
            var model = new Daybed.Model({session: session});
            model.load()
              .then(function () {
                assert.equal(model.records()[0].status, 'done');
                assert.equal(model.definition()['fields'], 'fff');
                done();
              });
        });

        server.respond();
    });

    it("can be defined from scratch and bound to session", function (done) {
        server.respondWith("PUT", "/models/pouet", '{"id": "pouet"}');

        var session = new Daybed.Session('');
        var model = new Daybed.Model();
        model.save({id: 'pouet', session: session})
             .then(function () {
                assert.equal(model.id, 'pouet');
                assert.equal(model.session, session);
                done();
             });

        server.respond();
    });
});
