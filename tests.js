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
function testModel(done) {
  var session = new DaybedSession(host, credentials);
  session.add_model("todo", {
    "title": "simple",
    "description": "One optional field",
    "fields": [{"name": "age",
                "type": "int",
                "required": false}]
  }, [{"age": 42}], function (err, resp) {
    session.get_model("todo", function(err, resp) {
      done(resp);
      session.delete_model("todo", done);
    });
  });
}
