module.exports = function(request) {
  function login(host, options) {
    if (host === undefined) {
      throw new Error("You should provide a host.");
    }
  
    if (options === undefined || options.redirect_uri === undefined) {
      throw new Error("You should provide a options.redirect_uri parameter.");
    }
  
    return request({
      method: "POST",
      host: host,
      body: {redirect_uri: options.redirect_uri},
      url: "/tokens/fxa-oauth/params",
      with_credentials: true
    }).then(function(doc) {
      console.log(doc.req.getResponseHeader('Session-Id'));
      sessionStorage.setItem("FxASessionId", doc.req.getResponseHeader('Session-Id'));
      document.location.href = (doc.oauth_uri + "/authorization?" +
      "client_id=" + doc.client_id +
      "&state=" + doc.state +
      "&scope=profile&action=signin");
    });
  }
  
  function getToken(host, options) {
    if (host === undefined) {
      throw new Error("You should provide a host.");
    }
  
    if (options === undefined || options.code === undefined || options.state === undefined) {
      throw new Error("options should contains code and state parameters");
    }
  
    return request({
      method: "POST",
      host: host,
      body: options,
      url: "/tokens/fxa-oauth/token",
      headers: {'Session-Id': sessionStorage.getItem("FxASessionId")}
    });
  }
  
  
  return {
    login: login,
    getToken: getToken
  }
};
