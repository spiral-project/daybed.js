/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function(exports) {

  "use strict";

  var TIMEOUT = 15000;

  function request(options) {
    return new Promise(function(resolve, reject) {
      var req = new XMLHttpRequest();
      req.open(options.method, options.url, true);
      req.setRequestHeader('Content-Type', 'application/json');
      req.setRequestHeader('Accept', 'application/json');
      req.responseType = 'json';
      req.timeout = TIMEOUT;

      if (options.validateOnly) {
        req.setRequestHeader('Validate-Only', 'true');
      }

      if (options.credentials) {
        var hawkHeader = hawk.client.header(options.url, options.method, {
          credentials: options.credentials
        });
        req.setRequestHeader('Authorization', hawkHeader.field);
      }

      req.onload = function() {
        // With some browsers, read responseText.
        // On some server error, response can be JSON.
        var response = req.response;
        if (response === undefined) {
          try {
            response = JSON.parse(req.responseText);
          }
          catch (e) {
            console.warn("Could not parse response as JSON");
            response = req.responseText;
          }
        }

        // Error bad status
        if (!("" + req.status).match(/^2/)) {
          var error = new Error(response);
          reject(error, req);
          return;
        }

        // Success
        resolve(response);
      };

      req.onerror = req.ontimeout = function(event) {
        var error = new Error(event.target.status);
        console.log('onerror');
        console.error(error);
        reject(error, req);
      };

      // Run request
      var body;
      if (options.body) {
        body = JSON.stringify(options.body);
      }
      req.send(body);
    });
  }

  function _credentials(hawkinfo) {
    hawkinfo = hawkinfo || {
      credentials: undefined,
      token: undefined
    };

    // token can be a function
    var credentials = hawkinfo.credentials;
    var token = typeof(hawkinfo.token) == 'function' ? hawkinfo.token()
                                                     : hawkinfo.token;

    // Derive credentials with hdfk
    if (!credentials && token) {
      deriveHawkCredentials(token, 'sessionToken', 32*2, function (creds) {
        credentials = creds;
      });
    }

    // Returns credentials with default algorithm
    if (credentials === undefined ||
        !credentials.hasOwnProperty("id") || credentials.id === undefined ||
        !credentials.hasOwnProperty("key") || credentials.key === undefined) {
      credentials = undefined;
    }
    else {
      credentials.algorithm = "sha256";
    }
    return credentials;
  }

  function getToken(host, options) {
    if (host === undefined) {
      throw new Error("You should provide a host.");
    }
    var credentials = _credentials(options);

    if (credentials) {
      // Check provided credentials
      return request({
        method: "GET",
        url: host + "/token",
        credentials: credentials
      });
    }
    else {
      // Create new credentials
      return request({
        method: "POST",
        url: host + "/tokens"
      });
    }
  }

  function hello(host) {
    return request({
      method: "GET",
      url: host + "/"
    });
  }

  function fields(host) {
    return request({
      method: "GET",
      url: host + "/fields"
    });
  }

  function spore(host) {
    return request({
      method: "GET",
      url: host + "/spore"
    });
  }

  function startSession(host, options) {
    options = options || {};

    var credentials = _credentials(options);

    return getToken(host, {credentials: credentials})
    .then(function (data) {
      return new Session(host, data);
    })
    .catch(function (error) {
      throw error;
    });
  }

  function Session(host, options) {
    options = options || {};
    if (host === undefined) {
      throw new Error("You should provide a host.");
    }
    this.host = host;
    this.options = options;
    this.token = options.token;
    this.credentials = _credentials(options);
  }

  Session.prototype = {

    hello: function () {
      return hello(this.host);
    },

    fields: function () {
      return fields(this.host);
    },

    spore: function () {
      return spore(this.host);
    },

    getModels: function() {
      return request({
        method: "GET",
        url: this.host + "/models",
        credentials: this.credentials
      })
      .then(function(doc) {
        return doc.models;
      });
    },

    loadModel: function(modelId) {
      var model = new Model({id: modelId, session: this});
      return model.load();
    },

    addModel: function(modelId, definition, records) {
      var url, method;

      if (modelId === undefined) {
        method = "POST";
        url = this.host + "/models";
      } else {
        method = "PUT";
        url = this.host + "/models/" + modelId;
      }

      return request({
        method: method,
        url: url,
        body: {definition: definition, records: records},
        credentials: this.credentials
      });
    },

    getModel: function(modelId) {
      return request({
        method: "GET",
        url: this.host + "/models/" + modelId,
        credentials: this.credentials
      });
    },

    deleteModel: function(modelId) {
      return request({
        method: "DELETE",
        url: this.host + "/models/" + modelId,
        credentials: this.credentials
      });
    },

    getDefinition: function(modelId) {
      return request({
        method: "GET",
        url: this.host + "/models/" + modelId + "/definition",
        credentials: this.credentials
      });
    },

    getPermissions: function(modelId) {
      return request({
        method: "GET",
        url: this.host + "/models/" + modelId + "/permissions",
        credentials: this.credentials
      });
    },

    putPermissions: function(modelId, permissions) {
      return request({
        method: "PUT",
        url: this.host + "/models/" + modelId + "/permissions",
        body: permissions,
        credentials: this.credentials
      });
    },

    patchPermissions: function(modelId, rules) {
      return request({
        method: "PATCH",
        url: this.host + "/models/" + modelId + "/permissions",
        body: rules,
        credentials: this.credentials
      });
    },

    getRecords: function(modelId) {
      return request({
        method: "GET",
        url: this.host + "/models/" + modelId + "/records",
        credentials: this.credentials
      });
    },

    deleteRecords: function(modelId) {
      return request({
        method: "DELETE",
        url: this.host + "/models/" + modelId + "/records",
        credentials: this.credentials
      });
    },

    getRecord: function(modelId, recordId) {
      return request({
        method: "GET",
        url: this.host + "/models/" + modelId + "/records/" + recordId,
        credentials: this.credentials
      });
    },

    addRecord: function(modelId, record) {
      var url, method;

      if (!record.hasOwnProperty("id") || !record.id) {
        method = "POST";
        url = this.host + "/models/" + modelId + "/records";
      } else {
        method = "PUT";
        url = this.host + "/models/" + modelId + "/records/" + record.id;
      }

      return request({
        method: method,
        url: url,
        body: record,
        credentials: this.credentials
      });
    },

    validateRecord: function(modelId, record) {
      var url, method;

      if (!record.hasOwnProperty("id")) {
        method = "POST";
        url = this.host + "/models/" + modelId + "/records";
      } else {
        method = "PUT";
        url = this.host + "/models/" + modelId + "/records/" + record.id;
      }

      return request({
        method: method,
        url: url,
        body: record,
        validateOnly: true,
        credentials: this.credentials
      });
    },

    patchRecord: function(modelId, recordId, patch) {
      return request({
        method: "PATCH",
        url: this.host + "/models/" + modelId + "/records/" + recordId,
        body: patch,
        credentials: this.credentials
      });
    },

    deleteRecord: function(modelId, recordId) {
      return request({
        method: "DELETE",
        url: this.host + "/models/" + modelId + "/records/" + recordId,
        credentials: this.credentials
      });
    }
  };


  function Model(options) {
    options = options || {};
    this.id = options.id;
    this.session = options.session;

    this._definition = options.definition;
    this._records = options.records || [];
  }

  Model.prototype = {

    add: function(record) {
      this._records.push(record);
    },

    definition: function() {
      return this._definition;
    },

    records: function() {
      return this._records;
    },

    load: function(options) {
      options = options || {};
      this.session = options.session || this.session;
      this.id = options.id || this.id;

      var self = this;
      return this.session.getModel(this.id)
        .then(function (resp) {
          self._definition = resp.definition;
          self._records = resp.records;
          return self;
        });
    },

    save: function(options) {
      options = options || {};
      this.session = options.session || this.session;
      var modelId = options.id || this.id;

      var self = this;
      return this.session.addModel(modelId, this._definition, this._records)
        .then(function(resp) {
          self.id = resp.id;
          return self;
        });
    },

    delete: function(options) {
      options = options || {};
      this.session = options.session || this.session;
      return session.deleteModel(this.id);
    }
  };


  var Daybed = {
    getToken: getToken,
    hello: hello,
    fields: fields,
    startSession: startSession,
    spore: spore,
    Session: Session,
    Model: Model
  };

  exports.Daybed = Daybed;

})(this);
