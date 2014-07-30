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
      if (!("" + req.status).match(/^2/) && !("" + req.status).match(/^3/)) {
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
  
    if (!credentials.hasOwnProperty("id") || credentials.id === undefined || 
        !credentials.hasOwnProperty("key") || credentials.key === undefined) {
      throw new Error("You cannot create a session without valid credentials.");
    }
  
    this.host = host;
    this.credentials = credentials;
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

    add_model: function(name, definition, records, cb) {
      if (cb === undefined) {
        cb = records;
        records = undefined;
      }

      var url, method;
      
      if (name === undefined) {
        method = "POST";
        url = this.host + "/models";
      } else {
        method = "PUT";
        url = this.host + "/models/" + name;
      }

      request({
        method: method,
        url: url,
        body: {definition: definition, records: records},
        credentials: this.credentials
      }, cb);
    },

    get_model: function(name, cb) {
      request({
        method: "GET",
        url: this.host + "/models/" + name,
        credentials: this.credentials
      }, cb);
    },

    delete_model: function(name, cb) {
      request({
        method: "DELETE",
        url: this.host + "/models/" + name,
        credentials: this.credentials
      }, cb);
    }
  };

  exports.getToken = getToken;
  exports.DaybedSession = DaybedSession;
})(this);
