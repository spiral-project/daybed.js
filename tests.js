/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// Write some tests
var host = "http://localhost:8000";

// Test Daybed.getToken and hello
function testHello(done) {
  Daybed.getToken(host)
    .then(hello);

  function hello(resp) {
    var session = new Daybed.Session(host, resp.credentials);
    session.hello()
      .then(done);
  }
}

// Test addModel and getModel
function testModelSessionApi(done) {
  var session;

  Daybed.getToken(host)
    .then(defineAgeModel);

  function defineAgeModel(resp) {
    session = new Daybed.Session(host, resp.credentials);
    session.addModel("age", {
      "title": "simple",
      "description": "One optional field",
      "fields": [{"name": "age",
                  "type": "int",
                  "required": false}]
    }, [{"age": 42}])
      .then(getAgeModel);
  }

  function getAgeModel(resp) {
    done("Add model", resp);
    session.getModel("age")
      .then(addRecord);
  }

  function addRecord(resp) {
    done("Get model", resp);
    session.addRecord("age", {"id": "123456", "age": 25})
      .then(getRecord);
  }

  function getRecord(resp) {
    done("Add record", resp);
    session.getRecord("age", "123456")
      .then(patchRecord);
  }

  function patchRecord(resp) {
    done("Get record", resp);
    session.patchRecord("age", "123456", {"age": 41})
      .then(deleteRecord);
  }

  function deleteRecord(resp) {
    done("Patch record", resp);
    session.deleteRecord("age", "123456")
      .then(addOtherRecord);
  }

  function addOtherRecord(resp) {
    done("Delete record", resp);
    session.addRecord("age", {"id": "123456", "age": 25})
      .then(getRecords);
  }

  function getRecords(resp) {
    done("Add record", resp);
    session.getRecords("age")
      .then(deleteRecords);
  }

  function deleteRecords(resp) {
    done("Get records", resp);
    session.deleteRecords("age")
      .then(getDefinition);
  }

  function getDefinition(err, resp) {
    done("Delete records", resp);
    session.getDefinition("age")
      .then(getPermissions);

  }

  function getPermissions(resp) {
    done("Model definition", resp);
    session.getPermissions("age")
      .then(deleteModel);
  }

  function deleteModel(resp) {
    done("Model permissions", resp);
    session.deleteModel("age")
      .then(function(resp) {
        done("Delete model", resp);
      });
  }
}

// Test Permissions API
function testPermissionsAPI(done) {
  var session, session2, tokenId, tokenId2;
  Daybed.getToken(host)
    .then(addAgesModel);

  function addAgesModel(resp) {
    session = new Daybed.Session(host, resp.credentials);
    tokenId = resp.credentials.id;

    session.addModel("ages", {
      "title": "simple",
      "description": "One optional field",
      "fields": [{"name": "age",
                  "type": "int",
                  "required": false}]
    }).then(getOtherToken);
  }

  function getOtherToken(resp) {
    done("Add model", resp);
    Daybed.getToken(host)
      .then(putPermissions);
  }

  function putPermissions(resp) {
    session2 = new Daybed.Session(host, resp.credentials);
    tokenId2 = resp.credentials.id;

    var permissions = {"Authenticated": ['delete_model', 'delete_all_records']};
    permissions[tokenId] = ["ALL"];
    permissions[tokenId2] = ["read_definition", "create_record", "read_own_records",
                      "update_own_records", "delete_own_records"];

    session.putPermissions("ages", permissions)
      .then(patchPermissions);
  }

  function patchPermissions(resp) {
    done("Put Permissions", resp);
    session.patchPermissions("ages", {"Everyone": ["read_definition"]})
      .then(addRecord);
  }

  function addRecord(resp) {
    done("Patch Permissions", resp);
    session.addRecord("ages", {"age": 25})
      .then(addRecord2);
  }

  function addRecord2(resp) {
    done("Add tokenId record", resp);
    session2.addRecord("ages", {"age": 42})
      .then(getRecords);
  }

  function getRecords(resp) {
    done("Add tokenId2 record", resp);
    session.getRecords("ages")
      .then(getRecords2);
  }

  function getRecords2(resp) {
    done("Get tokenId record", resp);
    session2.getRecords("ages")
      .then(deleteAgesModel);
  }

  function deleteAgesModel(resp) {
    done("Get tokenId2 record", resp);

    session.deleteModel("ages")
      .then(function(resp) {
        done("Delete ages", resp);
      });
  }
}

// Test Daybed.Model obj
function testModelApi(done) {

  var session,
      books;

  Daybed.getToken(host)
    .then(defineBookModel);

  function defineBookModel(resp) {
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

    books
      .save()
      .then(getBookModel);
  }

  function getBookModel(err, resp) {
    books = new Daybed.Model(session, "books");
    books.load()
      .then(function() {
        done(books.definition());
        done(books.records());
        deleteBookModel();
      }
    );
  }

  function deleteBookModel() {
    books.delete()
      .then(done);
  }
}

function testSpore(done) {
  Daybed.spore(host)
    .then(done);
}

function testFields(done) {
  Daybed.availableFields(host)
    .then(done);
}
