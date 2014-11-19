(function () {

  var server = 'https://daybed.io';
  var model = 'daybed:examples:search:extent';

  // Anonymous session
  var _session = new Daybed.Session(server);


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

  // Show all records on map, using GeoJSON
  _session.getRecords(model, {
      format: 'application/vnd.geo+json',
    })
    .then(function (geojson) {
      var options = {
        pointToLayer: function(featureData, latlng) {
          return L.circleMarker(latlng, {
            color: 'purple',
            fillOpacity: 0.7
          }).setRadius(4);
        }
      };

      L.geoJson(geojson, options).addTo(map);
    });


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

    return _session.searchRecords(model, query)
      .then(function (response) {
        // Flatten records from query results
        return response.hits.hits.map(function (r) {
          return r._source;
        });
      });
  }

})();
