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
        try {
          var hawkHeader = hawk.client.header(options.url, options.method, {
            credentials: options.credentials
          });
          req.setRequestHeader('Authorization', hawkHeader.field);
        }
        catch (e) {}
      }

      req.onload = function() {
        // With some browsers, read responseText.
        // On some server error, maybed no JSON.
        var response = req.response;
        if (response === undefined) {
          try {
            response = JSON.parse(req.responseText);
          }
          catch (e) {
            response = req.responseText;
          }
        }

        // Error bad status
        if (!("" + req.status).match(/^2/)) {
          reject(new Error(response));
          return;
        }
        // Success
        resolve(response);
      };

      req.onerror = req.ontimeout = function(event) {
        reject(new Error(event.target.status));
      };

      // Run request
      var body;
      if (options.body) {
        body = JSON.stringify(options.body);
      }
      req.send(body);
    });
  }

  function _credentials(credentials) {
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

  function getToken(host, credentials) {
    if (host === undefined) {
      throw new Error("You should provide an host.");
    }
    credentials = _credentials(credentials);
    if (credentials) {
      return request({
        method: "GET",
        url: host + "/token",
        credentials: credentials
      });
    }
    else {
      // Create one
      return request({
        method: "POST",
        url: host + "/tokens"
      });
    }
  }

  function availableFields(host) {
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
    options = options || {
      credentials: undefined,
      getToken: undefined
    };

    var credentials = options.credentials;
    var token = options.getToken && options.getToken();

    if (!credentials && token) {
      deriveHawkCredentials(token, 'sessionToken', 32*2, function (creds) {
        credentials = creds;
      });
    }

    return getToken(host, credentials)
    .catch(function () {
      throw new Error(arguments);
    })
    .then(function (data) {
      return new Session(host, data.credentials, {token: data.token});
    });
  }

  function Session(host, credentials, options) {
    options = options || {};
    if (host === undefined) {
      throw new Error("You should provide an host.");
    }
    this.host = host;
    this.token = options.token;
    this.credentials = _credentials(credentials);
    this.options = options;
  }

  Session.prototype = {
    hello: function() {
      return request({
        method: "GET",
        url: this.host + "/",
        credentials: this.credentials
      });
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

    addModel: function(modelname, definition, records) {
      var url, method;

      if (modelname === undefined) {
        method = "POST";
        url = this.host + "/models";
      } else {
        method = "PUT";
        url = this.host + "/models/" + modelname;
      }

      return request({
        method: method,
        url: url,
        body: {definition: definition, records: records},
        credentials: this.credentials
      });
    },

    getModel: function(modelname) {
      return request({
        method: "GET",
        url: this.host + "/models/" + modelname,
        credentials: this.credentials
      });
    },

    deleteModel: function(modelname) {
      return request({
        method: "DELETE",
        url: this.host + "/models/" + modelname,
        credentials: this.credentials
      });
    },

    getDefinition: function(modelname) {
      return request({
        method: "GET",
        url: this.host + "/models/" + modelname + "/definition",
        credentials: this.credentials
      });
    },

    getPermissions: function(modelname) {
      return request({
        method: "GET",
        url: this.host + "/models/" + modelname + "/permissions",
        credentials: this.credentials
      });
    },

    putPermissions: function(modelname, permissions) {
      return request({
        method: "PUT",
        url: this.host + "/models/" + modelname + "/permissions",
        body: permissions,
        credentials: this.credentials
      });
    },

    patchPermissions: function(modelname, rules) {
      return request({
        method: "PATCH",
        url: this.host + "/models/" + modelname + "/permissions",
        body: rules,
        credentials: this.credentials
      });
    },

    getRecords: function(modelname) {
      return request({
        method: "GET",
        url: this.host + "/models/" + modelname + "/records",
        credentials: this.credentials
      });
    },

    deleteRecords: function(modelname) {
      return request({
        method: "DELETE",
        url: this.host + "/models/" + modelname + "/records",
        credentials: this.credentials
      });
    },

    getRecord: function(modelname, recordId) {
      return request({
        method: "GET",
        url: this.host + "/models/" + modelname + "/records/" + recordId,
        credentials: this.credentials
      });
    },

    addRecord: function(modelname, record) {
      var url, method;

      if (!record.hasOwnProperty("id") || !record.id) {
        method = "POST";
        url = this.host + "/models/" + modelname + "/records";
      } else {
        method = "PUT";
        url = this.host + "/models/" + modelname + "/records/" + record.id;
      }

      return request({
        method: method,
        url: url,
        body: record,
        credentials: this.credentials
      });
    },

    validateRecord: function(modelname, record) {
      var url, method;

      if (!record.hasOwnProperty("id")) {
        method = "POST";
        url = this.host + "/models/" + modelname + "/records";
      } else {
        method = "PUT";
        url = this.host + "/models/" + modelname + "/records/" + record.id;
      }

      return request({
        method: method,
        url: url,
        body: record,
        validateOnly: true,
        credentials: this.credentials
      });
    },

    patchRecord: function(modelname, recordId, patch) {
      return request({
        method: "PATCH",
        url: this.host + "/models/" + modelname + "/records/" + recordId,
        body: patch,
        credentials: this.credentials
      });
    },

    deleteRecord: function(modelname, recordId) {
      return request({
        method: "DELETE",
        url: this.host + "/models/" + modelname + "/records/" + recordId,
        credentials: this.credentials
      });
    }
  };


  function Model(session, modelname, definition, records) {
    this.session = session;
    this.modelname = modelname;

    this._definition = definition;
    this._records = records || [];
  }

  Model.prototype = {
    load: function() {
      var self = this;
      return new Promise(function(resolve, reject) {
        self.session.getModel(self.modelname).then(function(resp) {
          console.debug(self._definition, "has been replaced by", resp.definition);
          console.debug(self._records, "has been replaced by", resp.records);

          self._definition = resp.definition;
          self._records = resp.records;
          resolve();
        }).catch(reject);
      });
    },
    add: function(record) {
      this._records.push(record);
    },
    definition: function() {
      return this._definition;
    },
    records: function() {
      return this._records;
    },
    save: function() {
      return this.session.addModel(this.modelname, this._definition, this._records);
    },
    delete: function() {
      return this.session.deleteModel(this.modelname);
    }
  };


  var Daybed = {
    getToken: getToken,
    availableFields: availableFields,
    startSession: startSession,
    spore: spore,
    Session: Session,
    Model: Model
  };

  exports.Daybed = Daybed;

})(this);
