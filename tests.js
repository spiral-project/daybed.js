/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// Write some tests
var host = "http://localhost:8000";
var credentials;

// Test getToken and hello
function testHello(done) {
  getToken(host, function(err, resp) {
    var session = new DaybedSession(host, resp.credentials);
    credentials = resp.credentials;
    session.hello(done);
  });
}

// Test add_model and get_model
function testModelSessionApi(done) {
  var session = new DaybedSession(host, credentials);
  session.add_model("age", {
    "title": "simple",
    "description": "One optional field",
    "fields": [{"name": "age",
                "type": "int",
                "required": false}]
  }, [{"age": 42}], function (err, resp) {
    session.get_model("age", function(err, resp) {
      done(resp);
      session.delete_model("age", done);
    });
  });
}

// Test Model obj
function testModelApi(done) {
  var session = new DaybedSession(host, credentials);

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
}
