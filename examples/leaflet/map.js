(function () {

  var server = 'https://daybed.io';
  var model = 'daybed:examples:leaflet:simple';

  var map = L.map('map', {
    doubleClickZoom: false,
    layers: [L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png')],
    center: [48.49, 1.395],
    zoom: 16
  });


  // Anonymous session
  var _session = new Daybed.Session(server);
  _session.getRecords(model)
    .then(function (response) {
      response.records.map(addRecord);
    })
    .catch(function (e) {
      if (e.status == 404) {
        return install();
      }
    });


  map.on('dblclick', function(event) {
    // LatLng to [x, y]
    var point = [event.latlng.lng, event.latlng.lat];

    _session.saveRecord(model, {location: point})
    .then(function (record) {
      record.location = point;  // Daybed returns id only
      addRecord(record);
    });
  });


  function addRecord(record) {
    // [x, y] to LatLng
    var latlng = record.location.reverse();

    var layer = L.marker(latlng);
    layer._record = record.id;
    map.addLayer(layer);

    layer.on('click', function () {
      deleteRecord(layer);
    });
  }

  function deleteRecord(layer) {
    _session.deleteRecord(model, layer._record)
    .then(function () {
      map.removeLayer(layer);
    });
  }


  function install() {
    var leafletModel = {
      definition: {
        title: 'Daybed Leaflet',
        description: 'Daybed + Leaflet',
        fields : [
          {name: 'location', type: 'point'},
        ],
      },
      permissions: {
        'Everyone': ['create_record', 'read_all_records',
                     'update_all_records', 'delete_all_records']
      }
    };

    Daybed.startSession(server)
    .then(function (session) {
      return session.saveModel(model, leafletModel);
    });
  }

})();
