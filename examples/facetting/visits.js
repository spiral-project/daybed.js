var server = 'https://daybed.io';
var model = 'daybed:examples:visits';


var plateformFields = [
  'name', 'version', 'product', 'manufacturer',
  'layout', 'os', 'description'
];

var featureFields = [
  'webgl', 'touch', 'geolocation', 'websockets', 'localstorage',
  'video', 'hashchange', 'canvas', 'fontface', 'flexbox'
];


var visit = {};

plateformFields.forEach(function (name) {
    visit[name] = '' + platform[name];
});

featureFields.forEach(function (name) {
    visit[name] = !!Modernizr[name];
});

// Record visit, unless DNT is set
if (navigator.doNotTrack === 'yes') {
  console.warn("Do-Not-Track is set.");
}
else {
  (new Daybed.Session(server)).saveRecord(model, visit)
    .then(function () {
      console.log("Thanks for your visit !");
    });
}


//
// Daybed model to store visits.
// (function ran manually in inspector only once)
function install() {
  var visitsModel = {
    definition: {
      title: 'Daybed visits',
      description: 'Daybed + facetting',
      fields : [
        {name: 'date', type: 'datetime', autonow: true},
      ]
    },
    permissions: {
      'Everyone': ['create_record']
    }
  };

  plateformFields.forEach(function (name) {
    var field = {
      name: name,
      type: 'string',
      required: false
    };
    visitsModel.definition.fields.push(field);
  });

  featureFields.forEach(function (name) {
    var field = {
      name: name,
      type: 'boolean',
      required: false
    };
    visitsModel.definition.fields.push(field);
  });

  var session;
  Daybed.startSession(server)
  .then(function (_session) {
    session = _session;
    console.log("Admin token", session.token);
    return Daybed.getToken(server);
  })
  .then(function (infos) {
    console.log("Viewer token", infos.token);
    visitsModel.permissions[infos.credentials.id] = ['read_all_records'];
    return session.saveModel(model, visitsModel);
  });
}
