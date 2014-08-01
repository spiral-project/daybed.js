/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function(exports) {

  "use strict";

  var TIMEOUT = 15000;

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

    if (options.validateOnly) {
      req.setRequestHeader('Validate-Only', 'true');
    }

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

  function getToken(daybedUrl, cb) {
    request({
      method: "POST",
      url: daybedUrl + "/tokens"
    }, cb);
  }

  function Session(host, credentials, options) {
    if (host === undefined) {
      throw new Error("You should provide an host.");
    }

    if (credentials === undefined ||
        !credentials.hasOwnProperty("id") || credentials.id === undefined ||
        !credentials.hasOwnProperty("key") || credentials.key === undefined) {
      credentials = undefined;
    }

    this.host = host;
    this.credentials = credentials;
    this.options = options;
  }

  Session.prototype = {
    hello: function(cb) {
      request({
        method: "GET",
        url: this.host + "/",
        credentials: this.credentials
      }, cb);
    },

    addModel: function(modelname, definition, records, cb) {
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

    getModel: function(modelname, cb) {
      request({
        method: "GET",
        url: this.host + "/models/" + modelname,
        credentials: this.credentials
      }, cb);
    },

    deleteModel: function(modelname, cb) {
      request({
        method: "DELETE",
        url: this.host + "/models/" + modelname,
        credentials: this.credentials
      }, cb);
    },

    getDefinition: function(modelname, cb) {
      request({
        method: "GET",
        url: this.host + "/models/" + modelname + "/definition",
        credentials: this.credentials
      }, cb);
    },

    getAcls: function(modelname, cb) {
      request({
        method: "GET",
        url: this.host + "/models/" + modelname + "/permissions",
        credentials: this.credentials
      }, cb);
    },

    putAcls: function(modelname, acls, cb) {
      request({
        method: "PUT",
        url: this.host + "/models/" + modelname + "/permissions",
        body: acls,
        credentials: this.credentials
      }, cb);
    },

    patchAcls: function(modelname, rules, cb) {
      request({
        method: "PATCH",
        url: this.host + "/models/" + modelname + "/permissions",
        body: rules,
        credentials: this.credentials
      }, cb);
    },

    getRecords: function(modelname, cb) {
      request({
        method: "GET",
        url: this.host + "/models/" + modelname + "/records",
        credentials: this.credentials
      }, cb);
    },

    deleteRecords: function(modelname, cb) {
      request({
        method: "DELETE",
        url: this.host + "/models/" + modelname + "/records",
        credentials: this.credentials
      }, cb);
    },

    getRecord: function(modelname, recordId, cb) {
      request({
        method: "GET",
        url: this.host + "/models/" + modelname + "/records/" + recordId,
        credentials: this.credentials
      }, cb);
    },

    addRecord: function(modelname, record, cb) {
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

    validateRecord: function(modelname, record, cb) {
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
        validateOnly: true,
        credentials: this.credentials
      }, cb);
    },

    patchRecord: function(modelname, recordId, patch, cb) {
      request({
        method: "PATCH",
        url: this.host + "/models/" + modelname + "/records/" + recordId,
        body: patch,
        credentials: this.credentials
      }, cb);
    },

    deleteRecord: function(modelname, recordId, cb) {
      request({
        method: "DELETE",
        url: this.host + "/models/" + modelname + "/records/" + recordId,
        credentials: this.credentials
      }, cb);
    },

    availableFields: function(cb) {
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
      this.session.addModel(this.modelname, this.definition, this.records, cb);
    },
    delete: function(cb) {
      this.session.deleteModel(this.modelname, cb);
    }
  };


  var Daybed = {
    getToken: getToken,
    Session: Session,
    Model: Model
  };

  exports.Daybed = Daybed;

})(this);
