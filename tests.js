/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// Write some tests
var host = "http://localhost:8000";

// Test getToken and hello
function testHello(done) {
  getToken(host, function(err, resp) {
    var session = new DaybedSession(host, resp.credentials);
    session.hello(done);
  });
}

// Test add_model and get_model
function testModelSessionApi(done) {
  getToken(host, function(err, resp) {
    if (err) throw new Error(err);
    var session = new DaybedSession(host, resp.credentials);
    session.add_model("age", {
      "title": "simple",
      "description": "One optional field",
      "fields": [{"name": "age",
                  "type": "int",
                  "required": false}]
    }, [{"age": 42}], function (err, resp) {
      done("Add model", resp);
      session.get_model("age", function(err, resp) {
        if (err) throw new Error(err);
        done("Get model", resp);
        session.add_record("age", {"id": "123456", "age": 25}, function(err, resp) {
          if (err) throw new Error(err);
          done("Add record", resp);
          session.get_record("age", "123456", function(err, resp) {
            if (err) throw new Error(err);
            done("Get record", resp);
            session.patch_record("age", "123456", {"age": 41}, function(err, resp) {
              if (err) throw new Error(err);
              done("Patch record", resp);
              session.delete_record("age", "123456", function(err, resp) {
                if (err) throw new Error(err);
                done("Delete record", resp);
                session.add_record("age", {"id": "123456", "age": 25}, function(err, resp) {
                  if (err) throw new Error(err);
                  done("Add record", resp);
                  session.get_records("age", function(err, resp) {
                    if (err) throw new Error(err);
                    done("Get records", resp);
                    session.delete_records("age", function(err, resp) {
                      if (err) throw new Error(err);
                      done("Delete records", resp);
                      session.get_definition("age", function(err, resp) {
                        if (err) throw err;
                        done("Model definition", resp);
                        session.get_acls("age", function(err, resp) {
                          if (err) throw err;
                          done("Model acls", resp);
                          session.delete_model("age", function(err, resp) {
                            if (err) throw err;
                            done("Delete model", resp);
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

// Test ACLs API
function testACLsAPI(done) {
  var session, session2, tokenId, tokenId2;
  getToken(host, function(err, resp) {
    if (err) throw new Error(err);
    session = new DaybedSession(host, resp.credentials);
    tokenId = resp.credentials.id;

    session.delete_model("ages", function(err, resp) {
      done("Delete model", err, resp);

      session.add_model("ages", {
        "title": "simple",
        "description": "One optional field",
        "fields": [{"name": "age",
                    "type": "int",
                    "required": false}]
      }, function (err, resp) {
        if (err) throw new Error(err);
        done("Add model", resp);

        getToken(host, function(err, resp) {
          if (err) throw new Error(err);
          session2 = new DaybedSession(host, resp.credentials);
          tokenId2 = resp.credentials.id;

          var acls = {"Authenticated": ['delete_model', 'delete_all_records']};
          acls[tokenId] = ["ALL"];
          acls[tokenId2] = ["read_definition", "create_record", "read_own_records",
                            "update_own_records", "delete_own_records"];

          session.put_acls("ages", acls, function(err, resp) {
            if (err) throw new Error(err);
            done("Put ACLs", resp);

            session.patch_acls("ages", {"Everyone": ["read_definition"]}, function(err, resp) {
              if (err) throw new Error(err);
              done("Patch ACLs", resp);

              session.add_record("ages", {"age": 25}, function(err, resp) {
                if (err) throw new Error(err);
                done("Add tokenId record", resp);

                session2.add_record("ages", {"age": 42}, function(err, resp) {
                  if (err) throw new Error(err);
                  done("Add tokenId2 record", resp);
                  session.get_records("ages", function(err, resp) {
                    if (err) throw new Error(err);
                    done("Get tokenId record", resp);
                    session2.get_records("ages", function(err, resp) {
                      if (err) throw new Error(err);
                      done("Get tokenId2 record", resp);
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

// Test Model obj
function testModelApi(done) {
  getToken(host, function(err, resp) {
    if (err) throw new Error(err);
    var session = new DaybedSession(host, resp.credentials);

    var books = new Model("books", {
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

    books.save(function (err, resp) {
      session.get_model("books", function(err, resp) {
        done(resp);
        books.delete(done);
      });
    });
  });
}

function testSpore(done) {
  var session = new DaybedSession(host);
  session.spore(done);
}

function testFields(done) {
  var session = new DaybedSession(host);
  session.available_fields(done);
}
