(function () {

  var server = 'https://daybed.io';
  var model = 'daybed:examples:search:extent';

  // Minimalistic React component
  // showing records within map extent
  var ResultsList = React.createClass({
    getInitialState: function() {
      return {results: []};
    },
    componentDidMount: function() {
      var self = this;
      this.props.map.on('moveend', function (e) {
        var bbox = e.target.getBounds();
        searchExtent(bbox)
          .then(function (results) {
            self.setState({results: results});
          });
      });
    },
    render: function() {
      var createItem = function(record) {
        return React.createElement("li", null, record.name);
      };
      return React.createElement("ul", null, this.state.results.map(createItem));
    }
  });


  // Basic map initialization
  var map = L.map('map')
    .setView([41.8, 12.5], 9);

  L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
      attribution: 'Map data &copy; OpenStreetMap contributors'
  }).addTo(map);

  L.control.sidebar('sidebar')
   .addTo(map)
   .show();

  // Render results, with reference on map
  React.render(
    React.createElement(ResultsList, {map: map}),
    document.getElementById('results'));

  // Show all records on map
  loadGeoJson()
    .then(function (geojson) {
      L.geoJson(geojson, {
        pointToLayer: function(featureData, latlng) {
          return L.circle(latlng, 30, {
            color: 'purple',
            fillOpacity: 1.0
          });
        }
      }).addTo(map);
    });


  // Re-usable session Promise
  var _session;
  function getSession() {
    _session = _session || Daybed.startSession(server, {anonymous: true});
    return _session;
  }

  // Helper to fetch records as GeoJSON
  function loadGeoJson() {
    return getSession()
      .then(function (session) {
        return session.getRecords(model, {
          format: 'application/vnd.geo+json',
        });
      });
  }

  // Helper to run ElasticSearch query on Leaflet LatLngBounds object
  function searchExtent(bbox) {
    var query = {
      size: 500,
      query: {
        filtered: {
          query: {
            match_all: {},
          },
          filter: {
            geo_bounding_box : {
              location: {
                top: bbox.getNorthWest().lat,
                left: bbox.getNorthWest().lng,
                bottom: bbox.getSouthEast().lat,
                right: bbox.getSouthEast().lng
              }
            }
          }
        }
      }
    };

    return getSession()
      .then(function (session) {
        return session.searchRecords(model, query);
      })
      .then(function (response) {
        // Flatten records from query results
        return response.hits.hits.map(function (r) {
          return r._source;
        });
      });
  }

})();
