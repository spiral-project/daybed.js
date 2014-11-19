var fs = require('fs');
var file = './italia-pizza.geojson';
var server = 'https://daybed.io';
var Daybed = require('daybed.js');


var model = {
    id: 'daybed:examples:search:extent',
    definition: {
      title: 'Daybed + ElasticSearch + Spatial',
      description: 'Search extent',
      fields: [
        {name: 'name', type: 'string', required: false},
        {name: 'location', type: 'point'},
      ]
    },
    permissions: {
      'Everyone': [
        'read_definition', 'read_all_records',
      ]
    }
};


fs.readFile(file, 'utf8', function (err, data) {
  saveGeoJSON(JSON.parse(data));
});


function saveGeoJSON(geojson) {
  var records = geojson.features.map(function (feature) {
    return {
      id: feature.id,
      location: feature.geometry.coordinates,
      name: feature.properties.name,
    };
  });

  model.records = records;

  Daybed.startSession(server)
    .then(function (session) {
      console.log('Model admin token:', session.token);
      return session.saveModel(model.id, model);
    })
    .catch(function (error) {
      console.dir(error.response.errors);
    });

}
