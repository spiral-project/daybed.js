/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// Write some tests
var host = "http://localhost:8000";

// Test Daybed.getToken and hello
function testHello(done) {
  Daybed.getToken(host)
    .then(function hello(resp) {
      var session = new Daybed.Session(host, resp.credentials);
      return session.hello();
    })
    .then(done);
}

// Test addModel and getModel
function testModelSessionApi(done) {
  var session;

  Daybed.getToken(host)
    .then(function defineAgeModel(resp) {
      session = new Daybed.Session(host, resp.credentials);
      return session.addModel("age", {
        "title": "simple",
        "description": "One optional field",
        "fields": [{"name": "age",
                    "type": "int",
                    "required": false}]
      }, [{"age": 42}]);
    })
    .then(function getAgeModel(resp) {
      done("Add model", resp);
      return session.getModel("age");
    })
    .then(function addRecord(resp) {
      done("Get model", resp);
      return session.addRecord("age", {"id": "123456", "age": 25});
    })
    .then(function getRecord(resp) {
      done("Add record", resp);
      return session.getRecord("age", "123456");
    })
    .then(function patchRecord(resp) {
      done("Get record", resp);
      return session.patchRecord("age", "123456", {"age": 41});
    })
    .then(function deleteRecord(resp) {
      done("Patch record", resp);
      return session.deleteRecord("age", "123456");
    })
    .then(function addOtherRecord(resp) {
      done("Delete record", resp);
      return session.addRecord("age", {"id": "123456", "age": 25});
    })
    .then(function getRecords(resp) {
      done("Add record", resp);
      return session.getRecords("age");
    })
    .then(function deleteRecords(resp) {
      done("Get records", resp);
      return session.deleteRecords("age");
    })
    .then(function getDefinition(err, resp) {
      done("Delete records", resp);
      return session.getDefinition("age");
    })
    .then(function getPermissions(resp) {
      done("Model definition", resp);
      return session.getPermissions("age");
    })
    .then(function deleteModel(resp) {
      done("Model permissions", resp);
      return session.deleteModel("age");
    })
    .then(function(resp) {
      done("Delete model", resp);
    });
}

// Test Permissions API
function testPermissionsAPI(done) {
  var session, session2, tokenId, tokenId2;
  Daybed.getToken(host)
    .then(function addAgesModel(resp) {
      session = new Daybed.Session(host, resp.credentials);
      tokenId = resp.credentials.id;
      
      return session.addModel("ages", {
        "title": "simple",
        "description": "One optional field",
        "fields": [{"name": "age",
                    "type": "int",
                    "required": false}]
      });
    })
    .then(function getOtherToken(resp) {
      done("Add model", resp);
      return Daybed.getToken(host);
    })
    .then(function putPermissions(resp) {
      session2 = new Daybed.Session(host, resp.credentials);
      tokenId2 = resp.credentials.id;

      var permissions = {"Authenticated": ['delete_model', 'delete_all_records']};
      permissions[tokenId] = ["ALL"];
      permissions[tokenId2] = ["read_definition", "create_record", "read_own_records",
                               "update_own_records", "delete_own_records"];
      
      return session.putPermissions("ages", permissions);
    })
    .then(function patchPermissions(resp) {
      done("Put Permissions", resp);
      return session.patchPermissions("ages", {"Everyone": ["read_definition"]});
    })
    .then(function addRecord(resp) {
      done("Patch Permissions", resp);
      return session.addRecord("ages", {"age": 25});
    })
    .then(function addRecord2(resp) {
      done("Add tokenId record", resp);
      return session2.addRecord("ages", {"age": 42});
    })
    .then(function getRecords(resp) {
      done("Add tokenId2 record", resp);
      return session.getRecords("ages");
    })
    .then(function getRecords2(resp) {
      done("Get tokenId record", resp);
      return session2.getRecords("ages");
    })
    .then(function deleteAgesModel(resp) {
      done("Get tokenId2 record", resp);

      return session.deleteModel("ages");
    })
    .then(function(resp) {
      done("Delete ages", resp);
    });
}

// Test Daybed.Model obj
function testModelApi(done) {

  var session,
      books;

  Daybed.getToken(host)
    .then(function defineBookModel(resp) {
      session = new Daybed.Session(host, resp.credentials);

      books = new Daybed.Model(session, "books", {
        title: 'book',
        description: "The list of books to read",
        fields: [
          {
            name: "title",
            type: "string",
            label: "Title"
          },
          {
            name: "author",
            type: "string",
            label: "Author"
          },
          {
            name: "summary",
            type: "string",
            label: "Summary"
          }
        ]
      });

      books.add(
        {
          title: "Critique de la raison numérique",
          author: "Dominique Mazuet, Delga",
          summary: "http://www.librairie-quilombo.org/spip.php?article5532"
        }
      );
      
      return books.save();
    })
    .then(function getBookModel(err, resp) {
      books = new Daybed.Model(session, "books");
      return books.load();
    })
    .then(function() {
      done(books.definition());
      done(books.records());
      return books.delete();
    })
    .then(done);
}

function testSpore(done) {
  Daybed.spore(host)
    .then(done);
}

function testFields(done) {
  Daybed.availableFields(host)
    .then(done);
}
