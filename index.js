"use strict";

var hawk = require('hawk');
var deriveHawkCredentials = require('./ext/hkdf.js').deriveHawkCredentials;

var TIMEOUT = 15000;

function request(options) {
  return new Promise(function(resolve, reject) {
    var req = new XMLHttpRequest();
    options.url = options.host + '/v1' + options.url;
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
        console.error(error);
        reject(error, req);
        return;
      }

      // Success
      resolve(response);
    };

    req.onerror = req.ontimeout = function(event) {
      var error = new Error(event.target.status);
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
      host: host,
      url: "/token",
      credentials: credentials
    });
  }
  else {
    // Create new credentials
    return request({
      method: "POST",
      host: host,
      url: "/tokens"
    });
  }
}

function hello(host) {
  return request({
    method: "GET",
    host: host,
    url: "/"
  });
}

function fields(host) {
  return request({
    method: "GET",
    host: host,
    url: "/fields"
  });
}

function spore(host) {
  return request({
    method: "GET",
    host: host,
    url: "/spore"
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
      host: this.host,
      url: "/models",
      credentials: this.credentials
    })
    .then(function(doc) {
      return doc.models;
    });
  },

  getModel: function(modelId) {
    return request({
      method: "GET",
      host: this.host,
      url: "/models/" + modelId,
      credentials: this.credentials
    });
  },

  loadModel: function(modelId) {
    var model = new Model({id: modelId, session: this});
    return model.load();
  },

  saveModel: function(modelId, definition, records) {
    var url, method;

    if (modelId === undefined) {
      method = "POST";
      url = "/models";
    } else {
      method = "PUT";
      url = "/models/" + modelId;
    }

    return request({
      method: method,
      host: this.host,
      url: url,
      body: {definition: definition, records: records},
      credentials: this.credentials
    });
  },

  saveModels: function(definitions) {
    var self = this;
    return this.getModels()
    .then(function(models) {
      var existingIds = models.map(function(doc) {
        return doc.id;
      });
      return existingIds;
    })
    .then(function (existingIds) {
      var addMissingModels = Object.keys(models).map(function (modelId) {
        modelId = self.prefixed(modelId);
        if (existingIds.indexOf(modelId) === -1) {
          return self.saveModel(modelId, definitions[modelId]);
        }
        else {
          console.debug("Model", modelId, "already exists.");
        }
      });
      return Promise.all(addMissingModels);
    });
  },

  deleteModel: function(modelId) {
    return request({
      method: "DELETE",
      host: this.host,
      url: "/models/" + modelId,
      credentials: this.credentials
    });
  },

  getDefinition: function(modelId) {
    return request({
      method: "GET",
      host: this.host,
      url: "/models/" + modelId + "/definition",
      credentials: this.credentials
    });
  },

  getPermissions: function(modelId) {
    return request({
      method: "GET",
      host: this.host,
      url: "/models/" + modelId + "/permissions",
      credentials: this.credentials
    });
  },

  savePermissions: function(modelId, permissions, options) {
    options = options || {};
    var method = !!options.replace ? 'PUT' : 'PATCH';
    return request({
      method: method,
      host: this.host,
      url: "/models/" + modelId + "/permissions",
      body: permissions,
      credentials: this.credentials
    });
  },

  getRecords: function(modelId) {
    if (modelId.constructor == Array) {
      return this._getMultiRecords(modelId);
    }

    return request({
      method: "GET",
      host: this.host,
      url: "/models/" + modelId + "/records",
      credentials: this.credentials
    });
  },

  _getMultiRecords: function(modelsIds) {
    var data = {};
    var getRecords = modelsIds.map(function(modelId) {
      return this.getRecords(modelId)
        .then(function(records) {
          data[modelId] = records;
        });
    }.bind(this));

    return Promise.all(getRecords)
      .then(function() {
        return data;
      });
  },

  deleteAllRecords: function(modelId) {
    return request({
      method: "DELETE",
      host: this.host,
      url: "/models/" + modelId + "/records",
      credentials: this.credentials
    });
  },

  getRecord: function(modelId, recordId) {
    return request({
      method: "GET",
      host: this.host,
      url: "/models/" + modelId + "/records/" + recordId,
      credentials: this.credentials
    });
  },

  saveRecord: function(modelId, record, options) {
    options = options || {};
    var url, method;

    if (!record.hasOwnProperty("id") || !record.id) {
      method = "POST";
      url = "/models/" + modelId + "/records";
    } else {
      method = options.replace ? "PUT" : "PATCH";
      url = "/models/" + modelId + "/records/" + record.id;
    }

    return request({
      method: method,
      host: this.host,
      url: url,
      body: record,
      validateOnly: !!options.validateOnly,
      credentials: this.credentials
    });
  },

  saveRecords: function(modelId, records) {
    // Save all
    var addUpdateRecords = records.map(function(record) {
      return this.saveRecord(modelId, record);
    });
    return Promise.all(addUpdateRecords);
  },

  validateRecord: function(modelId, record) {
    return this.saveRecord(modelId, record, {validateOnly: true});
  },

  deleteRecord: function(modelId, recordId) {
    return request({
      method: "DELETE",
      host: this.host,
      url: "/models/" + modelId + "/records/" + recordId,
      credentials: this.credentials
    });
  },

  deleteRecords: function(modelId, records) {
    var deleteAll = records.map(function(record) {
      return this.deleteRecord(modelId, record);
    }.bind(this));

    return Promise.all(deleteAll);
  },

  synchronizeRecords: function (modelId, records) {
    if (typeof modelId == 'object') {
      return this._synchronizeMultiRecords(modelId);
    }

    var recordsById = {},
        remotesById = {};

    var recordsIds, remotesIds;

    records.forEach(function (record) {
      recordsById[record.id] = record;
    });
    recordsIds = Object.keys(recordsById);

    return this.getRecords(modelId)
      .then(function(remotes) {
        // Get remote records
        remotes.forEach(function (remote) {
          remotesById[remote.id] = remote;
        });
        remotesIds = Object.keys(remotesById);
      })
      .then(function () {
        // Get created/updated records
        var changedRecords = recordsIds.map(function(recordId) {
          var record = recordsById[recordId],
              remote = remotesById[recordId];
          if (!objectEquals(record, remote)) {
            return record;
          }
        });
        return this.addRecords(modelId, changedRecords);
      })
      .then(function() {
        // Get deleted records
        var deletedIds = remotesIds.filter(function(recordId) {
          return recordsIds.indexOf(recordId) === -1;
        });
        return this.deleteRecords(modelId, deletedIds);
      });
  },

  _synchronizeMultiRecords: function(recordsByModelId) {
    var synchronizeAll = Object.keys(recordsByModelId).map(function (modelId) {
      var records = recordsByModelId[modelId];
      return this.synchronizeRecords(modelId, records);
    }.bind(this));
    return Promise.all(synchronizeAll);
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
    var self = this;
    options = options || {};
    self.session = options.session || self.session;
    self.id = options.id || self.id;

    return self.session.getModel(self.id)
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
    return this.session.saveModel(modelId, this._definition, this._records)
      .then(function(resp) {
        self.id = resp.id;
        return self;
      });
  },

  delete: function(options) {
    options = options || {};
    this.session = options.session || this.session;
    return this.session.deleteModel(this.id);
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

window.Daybed = Daybed;
module.exports = Daybed;
