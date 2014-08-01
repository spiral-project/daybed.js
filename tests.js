/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// Write some tests
var host = "http://localhost:8000";

// Test Daybed.getToken and hello
function testHello(done) {
  Daybed.getToken(host, hello);

  function hello(err, resp) {
    var session = new Daybed.Session(host, resp.credentials);
    session.hello(done);
  }
}

// Test addModel and getModel
function testModelSessionApi(done) {
  var session;

  Daybed.getToken(host, defineAgeModel);

  function defineAgeModel(err, resp) {
    if (err) throw new Error(err);
    session = new Daybed.Session(host, resp.credentials);
    session.addModel("age", {
      "title": "simple",
      "description": "One optional field",
      "fields": [{"name": "age",
                  "type": "int",
                  "required": false}]
    }, [{"age": 42}], getAgeModel);
  }

  function getAgeModel(err, resp) {
    if (err) throw new Error(err);
    done("Add model", resp);
    session.getModel("age", addRecord);
  }

  function addRecord(err, resp) {
    if (err) throw new Error(err);
    done("Get model", resp);
    session.addRecord("age", {"id": "123456", "age": 25}, getRecord);
  }

  function getRecord(err, resp) {
    if (err) throw new Error(err);
    done("Add record", resp);
    session.getRecord("age", "123456", patchRecord);
  }

  function patchRecord(err, resp) {
    if (err) throw new Error(err);
    done("Get record", resp);
    session.patchRecord("age", "123456", {"age": 41}, deleteRecord);
  }

  function deleteRecord(err, resp) {
    if (err) throw new Error(err);
    done("Patch record", resp);
    session.deleteRecord("age", "123456", addOtherRecord);
  }

  function addOtherRecord(err, resp) {
    if (err) throw new Error(err);
    done("Delete record", resp);
    session.addRecord("age", {"id": "123456", "age": 25}, getRecords);
  }

  function getRecords(err, resp) {
    if (err) throw new Error(err);
    done("Add record", resp);
    session.getRecords("age", deleteRecords);
  }

  function deleteRecords(err, resp) {
    if (err) throw new Error(err);
    done("Get records", resp);
    session.deleteRecords("age", getDefinition);
  }

  function getDefinition(err, resp) {
    if (err) throw new Error(err);
    done("Delete records", resp);
    session.getDefinition("age", getPermissions);
  }

  function getPermissions(err, resp) {
    if (err) throw new Error(err);
    done("Model definition", resp);
    session.getPermissions("age", deleteModel);
  }

  function deleteModel(err, resp) {
    if (err) throw err;
    done("Model permissions", resp);
    session.deleteModel("age", function(err, resp) {
      if (err) throw err;
      done("Delete model", resp);
    });
  }
}

// Test Permissions API
function testPermissionsAPI(done) {
  var session, session2, tokenId, tokenId2;
  Daybed.getToken(host, addAgesModel);

  function addAgesModel(err, resp) {
    if (err) throw new Error(err);
    session = new Daybed.Session(host, resp.credentials);
    tokenId = resp.credentials.id;

    session.addModel("ages", {
      "title": "simple",
      "description": "One optional field",
      "fields": [{"name": "age",
                  "type": "int",
                  "required": false}]
    }, getOtherToken);
  }

  function getOtherToken(err, resp) {
    if (err) throw new Error(err);
    done("Add model", resp);

    Daybed.getToken(host, putPermissions);
  }

  function putPermissions(err, resp) {
    if (err) throw new Error(err);
    session2 = new Daybed.Session(host, resp.credentials);
    tokenId2 = resp.credentials.id;

    var permissions = {"Authenticated": ['delete_model', 'delete_all_records']};
    permissions[tokenId] = ["ALL"];
    permissions[tokenId2] = ["read_definition", "create_record", "read_own_records",
                      "update_own_records", "delete_own_records"];

    session.putPermissions("ages", permissions, patchPermissions);
  }

  function patchPermissions(err, resp) {
    if (err) throw new Error(err);
    done("Put Permissions", resp);
    session.patchPermissions("ages", {"Everyone": ["read_definition"]}, addRecord);
  }

  function addRecord(err, resp) {
    if (err) throw new Error(err);
    done("Patch Permissions", resp);
    session.addRecord("ages", {"age": 25}, addRecord2);
  }

  function addRecord2(err, resp) {
    if (err) throw new Error(err);
    done("Add tokenId record", resp);
    session2.addRecord("ages", {"age": 42}, getRecords);
  }

  function getRecords(err, resp) {
    if (err) throw new Error(err);
    done("Add tokenId2 record", resp);
    session.getRecords("ages", getRecords2);
  }

  function getRecords2(err, resp) {
    if (err) throw new Error(err);
    done("Get tokenId record", resp);
    session2.getRecords("ages", deleteAgesModel);
  }

  function deleteAgesModel(err, resp) {
    if (err) throw new Error(err);
    done("Get tokenId2 record", resp);

    session.deleteModel("ages", function(err, resp) {
      if (err) throw new Error(err);
      done("Delete ages", resp);
    });
  }
}

// Test Daybed.Model obj
function testModelApi(done) {

  var session,
      books;

  Daybed.getToken(host, defineBookModel);

  function defineBookModel(err, resp) {
    if (err) throw new Error(err);
    session = new Daybed.Session(host, resp.credentials);

    books = new Daybed.Model("books", {
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
    }, session);

    books.add(
      {
        title: "Critique de la raison numérique",
        author: "Dominique Mazuet, Delga",
        summary: "http://www.librairie-quilombo.org/spip.php?article5532"
      }
    );

    books.save(getBookModel);
  }

  function getBookModel(err, resp) {
    session.getModel("books", deleteBookModel);
  }

  function deleteBookModel(err, resp) {
    done(resp);
    books.delete(done);
  }
}

function testSpore(done) {
  Daybed.spore(host, done);
}

function testFields(done) {
  Daybed.availableFields(host, done);
}
