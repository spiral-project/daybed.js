"use strict";

var isNode = (typeof process !== 'undefined' && process.title === 'node');
if (isNode) {
    global.XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
}

var Promise = require('promise-polyfill');
var utils = require('./ext/utils.js');
var console = require("console");
var hawk = require('hawk');
var deriveHawkCredentials = require('./ext/hkdf.js').deriveHawkCredentials;

var TIMEOUT = 15000;


function DaybedError(options) {
  options = options || {};
  this.name = "DaybedError";
  this.message = options.message || "";
  this.status = options.status;
  this.response = options.response;
}
DaybedError.prototype = new Error();
DaybedError.prototype.constructor = DaybedError;


function request(options) {
  return new Promise(function(resolve, reject) {
    var req = new XMLHttpRequest();
    options.url = options.host + '/v1' + options.url;
    req.open(options.method, options.url, true);
    req.setRequestHeader('Content-Type', options.format || 'application/json');
    req.setRequestHeader('Accept', options.format || 'application/json');
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
        var error = new DaybedError({
          status: req.status,
          message: req.statusText,
          response: response,
        });
        reject(error);
        return;
      }

      // Success
      resolve(response);
    };

    req.onerror = req.ontimeout = function(event) {
      var error = new DaybedError({
          status: event.target.status,
          message: event.target.statusText,
          response: event.target,
      });
      reject(error);
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

  // Derive credentials with hkdf
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

  if (options.anonymous) {
    return new Promise(function(resolve, reject) {
      resolve(new Session(host));
    });
  }

  return getToken(host, {credentials: credentials})
    .then(function (data) {
      return new Session(host, data);
    })
    .catch(function(error) {
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
  this.prefix = options.prefix || '';
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

  _prefixed: function (modelId) {
    return (new RegExp('^' + this.prefix)).test(modelId) ?
      modelId : this.prefix + modelId;
  },

  getModel: function(modelId) {
    return request({
      method: "GET",
      host: this.host,
      url: "/models/" + this._prefixed(modelId),
      credentials: this.credentials
    });
  },

  saveModel: function(modelId, model) {
    var url, method;

    if (modelId === undefined) {
      method = "POST";
      url = "/models";
    } else {
      method = "PUT";
      url = "/models/" + this._prefixed(modelId);
    }

    var create = request({
      method: method,
      host: this.host,
      url: url,
      body: model,
      credentials: this.credentials
    });

    return create;
  },

  saveModels: function(models) {
    var self = this;
    return this.getModels()
    .then(function(existing) {
      var existingIds = existing.map(function(doc) {
        return doc.id;
      });
      return existingIds;
    })
    .then(function (existingIds) {
      var addMissingModels = Object.keys(models).map(function (modelId) {
        modelId = self._prefixed(modelId);
        if (existingIds.indexOf(modelId) === -1) {
          return self.saveModel(modelId, models[modelId]);
        }
        else {
          console.debug("Model", modelId, "already exists.");
          return self.getDefinition(modelId);
        }
      });
      return Promise.all(addMissingModels);
    });
  },

  deleteModel: function(modelId) {
    return request({
      method: "DELETE",
      host: this.host,
      url: "/models/" + this._prefixed(modelId),
      credentials: this.credentials
    });
  },

  getDefinition: function(modelId) {
    return request({
      method: "GET",
      host: this.host,
      url: "/models/" + this._prefixed(modelId) + "/definition",
      credentials: this.credentials
    });
  },

  getPermissions: function(modelId) {
    return request({
      method: "GET",
      host: this.host,
      url: "/models/" + this._prefixed(modelId) + "/permissions",
      credentials: this.credentials
    });
  },

  savePermissions: function(modelId, permissions, options) {
    options = options || {};
    var method = !!options.replace ? 'PUT' : 'PATCH';
    return request({
      method: method,
      host: this.host,
      url: "/models/" + this._prefixed(modelId) + "/permissions",
      body: permissions,
      credentials: this.credentials
    });
  },

  getRecords: function(modelId, options) {
    options = options || {};

    if (modelId.constructor == Array) {
      return this._getMultiRecords(modelId);
    }

    return request({
      method: "GET",
      host: this.host,
      url: "/models/" + this._prefixed(modelId) + "/records",
      credentials: this.credentials,
      format: options.format
    });
  },

  searchRecords: function(modelId, query) {
    return request({
      method: "POST",
      host: this.host,
      url: "/models/" + this._prefixed(modelId) + "/search/",
      credentials: this.credentials,
      body: query
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

  getRecord: function(modelId, recordId) {
    return request({
      method: "GET",
      host: this.host,
      url: "/models/" + this._prefixed(modelId) + "/records/" + recordId,
      credentials: this.credentials
    });
  },

  saveRecord: function(modelId, record, options) {
    options = options || {};
    var validateOnly = !!options.validateOnly;

    var url, method;

    if (validateOnly || !record.hasOwnProperty("id") || !record.id) {
      method = "POST";
      url = "/models/" + this._prefixed(modelId) + "/records";
    } else {
      method = options.replace ? "PUT" : "PATCH";
      url = "/models/" + this._prefixed(modelId) + "/records/" + record.id;
    }

    return request({
      method: method,
      host: this.host,
      url: url,
      body: record,
      validateOnly: validateOnly,
      credentials: this.credentials
    });
  },

  saveRecords: function(modelId, records, options) {
    // Save all
    var addUpdateRecords = records.map(function(record) {
      return this.saveRecord(modelId, record, options);
    }.bind(this));
    return Promise.all(addUpdateRecords);
  },

  validateRecord: function(modelId, record) {
    return this.saveRecord(modelId, record, {validateOnly: true});
  },

  deleteRecord: function(modelId, recordId) {
    return request({
      method: "DELETE",
      host: this.host,
      url: "/models/" + this._prefixed(modelId) + "/records/" + recordId,
      credentials: this.credentials
    });
  },

  deleteRecords: function(modelId, records) {
    var deleteAll = records.map(function(record) {
      return this.deleteRecord(modelId, record);
    }.bind(this));
    return Promise.all(deleteAll);
  },

  deleteAllRecords: function(modelId) {
    return request({
      method: "DELETE",
      host: this.host,
      url: "/models/" + this._prefixed(modelId) + "/records",
      credentials: this.credentials
    });
  },

  synchronizeRecords: function (modelId, records, options) {
    if (typeof modelId == 'object') {
      return this._synchronizeMultiRecords(modelId);
    }

    var syncResult = {
      created: [],
      deleted: [],
      updated: [],
    };

    var remotesById = {};
    var remotesIds;

    var recordsIds = records.map(function (record) {
      return record.id;
    });

    return this.getRecords(modelId)
      .then(function(response) {
        // Get remote records before saving the new ones
        response.records.forEach(function (remote) {
          remotesById[remote.id] = remote;
        });
        remotesIds = Object.keys(remotesById);

        // Get created records
        var createdRecords = records.filter(function (record) {
          return record.id === undefined;
        });

        return this.saveRecords(modelId, createdRecords);
      }.bind(this))
      .then(function (created) {
        syncResult.created = created;

        // Get updated records
        var changedRecords = records.filter(function(record) {
          if (record.id === undefined)
            return false;
          var remote = remotesById[record.id];
          return !utils.objectEquals(record, remote);
        });
        return this.saveRecords(modelId, changedRecords);
      }.bind(this))
      .then(function(updated) {
        syncResult.updated = updated;

        // Get deleted records
        var deletedIds = remotesIds.filter(function(recordId) {
          return recordsIds.indexOf(recordId) === -1;
        });
        return this.deleteRecords(modelId, deletedIds);
      }.bind(this))
      .then(function (deleted) {
        syncResult.deleted = deleted;

        return syncResult;
      });
  },

  _synchronizeMultiRecords: function(recordsByModelId) {
    var modelIds = Object.keys(recordsByModelId);
    var synchronizeAll = modelIds.map(function (modelId) {
      var records = recordsByModelId[modelId];
      return this.synchronizeRecords(modelId, records);
    }.bind(this));

    return Promise.all(synchronizeAll)
    .then(function (responses) {
      var results = {};
      modelIds.forEach(function (modelId, i) {
        results[modelId] = responses[i];
      });
      return results;
    });
  }
};


var Daybed = {
  getToken: getToken,
  hello: hello,
  fields: fields,
  startSession: startSession,
  spore: spore,
  Session: Session
};

module.exports = Daybed;
