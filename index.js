/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";
var TIMEOUT = 15000;

(function(exports) {

  function callback(cb, args) {
    if (cb && typeof cb === 'function') {
      cb.apply(null, args);
    }
  }

  function request(options, cb) {
    var req = new XMLHttpRequest();
    req.open(options.method, options.url, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.setRequestHeader('Accept', 'application/json');
    req.responseType = 'json';
    req.timeout = TIMEOUT;
    // req.withCredentials = true;

    if (options.credentials) {
      var hawkHeader = hawk.client.header(options.url, options.method, {
        credentials: options.credentials
      });
      req.setRequestHeader('authorization', hawkHeader.field);
    }
    req.onload = function() {
      if (!("" + req.status).match(/^2/)) {
        callback(cb, [req.response]);
        return;
      }
      callback(cb, [null, req.response]);
    };

    req.onerror = req.ontimeout = function(event) {
      callback(cb, [event.target.status]);
    };

    var body;
    if (options.body) {
      body = JSON.stringify(options.body);
    }

    req.send(body);
  }

  function getToken(daybed_url, cb) {
    request({
      method: "POST",
      url: daybed_url + "/tokens"
    }, cb);
  }

  function DaybedSession(host, credentials, options) {
    if (host === undefined) {
      throw new Error("You should provide an host.");
    }
  
    if (credentials === undefined ||
        !credentials.hasOwnProperty("id") || credentials.id === undefined ||
        !credentials.hasOwnProperty("key") || credentials.key === undefined) {
      credentials = undefined;
    } else {
      this.credentials = credentials;
    }
  
    this.host = host;
    this.options = options;
  }

  DaybedSession.prototype = {
    hello: function(cb) {
      request({
        method: "GET",
        url: this.host + "/",
        credentials: this.credentials
      }, cb);
    },

    add_model: function(modelname, definition, records, cb) {
      if (cb === undefined) {
        cb = records;
        records = undefined;
      }

      var url, method;
      
      if (modelname === undefined) {
        method = "POST";
        url = this.host + "/models";
      } else {
        method = "PUT";
        url = this.host + "/models/" + modelname;
      }

      request({
        method: method,
        url: url,
        body: {definition: definition, records: records},
        credentials: this.credentials
      }, cb);
    },

    get_model: function(modelname, cb) {
      request({
        method: "GET",
        url: this.host + "/models/" + modelname,
        credentials: this.credentials
      }, cb);
    },

    delete_model: function(modelname, cb) {
      request({
        method: "DELETE",
        url: this.host + "/models/" + modelname,
        credentials: this.credentials
      }, cb);
    },

    get_definition: function(modelname, cb) {
      request({
        method: "GET",
        url: this.host + "/models/" + modelname + "/definition",
        credentials: this.credentials
      }, cb);
    },

    get_acls: function(modelname, cb) {
      request({
        method: "GET",
        url: this.host + "/models/" + modelname + "/acls",
        credentials: this.credentials
      }, cb);
    },

    put_acls: function(modelname, acls, cb) {
      request({
        method: "PUT",
        url: this.host + "/models/" + modelname + "/acls",
        body: acls,
        credentials: this.credentials
      }, cb);
    },

    patch_acls: function(modelname, rules, cb) {
      request({
        method: "PATCH",
        url: this.host + "/models/" + modelname + "/acls",
        body: rules,
        credentials: this.credentials
      }, cb);
    },

    get_records: function(modelname, cb) {
      request({
        method: "GET",
        url: this.host + "/models/" + modelname + "/records",
        credentials: this.credentials
      }, cb);
    },

    delete_records: function(modelname, cb) {
      request({
        method: "DELETE",
        url: this.host + "/models/" + modelname + "/records",
        credentials: this.credentials
      }, cb);
    },

    get_record: function(modelname, record_id, cb) {
      request({
        method: "GET",
        url: this.host + "/models/" + modelname + "/records/" + record_id,
        credentials: this.credentials
      }, cb);
    },

    add_record: function(modelname, record, cb) {
      var url, method;

      if (!record.hasOwnProperty("id")) {
        method = "POST";
        url = this.host + "/models/" + modelname + "/records";
      } else {
        method = "PUT";
        url = this.host + "/models/" + modelname + "/records/" + record.id;
      }

      request({
        method: method,
        url: url,
        body: record,
        credentials: this.credentials
      }, cb);
    },

    patch_record: function(modelname, record_id, patch, cb) {
      request({
        method: "PATCH",
        url: this.host + "/models/" + modelname + "/records/" + record_id,
        body: patch,
        credentials: this.credentials
      }, cb);
    },

    delete_record: function(modelname, record_id, cb) {
      request({
        method: "DELETE",
        url: this.host + "/models/" + modelname + "/records/" + record_id,
        credentials: this.credentials
      }, cb);
    },

    available_fields: function(cb) {
      request({
        method: "GET",
        url: this.host + "/fields"
      }, cb);
    },

    spore: function(cb) {
      request({
        method: "GET",
        url: this.host + "/spore"
      }, cb);
    }
  };


  function Model(modelname, definition, session, records) {
    this.modelname = modelname;
    this.definition = definition;
    this.records = records || [];
    this.session = session;
  }

  Model.prototype = {
    add: function(record) {
      this.records.push(record);
    },
    save: function(cb) {
      this.session.add_model(this.modelname, this.definition, this.records, cb);
    },
    delete: function(cb) {
      this.session.delete_model(this.modelname, cb);
    }
  };

  exports.getToken = getToken;
  exports.DaybedSession = DaybedSession;
  exports.Model = Model;
})(this);
