(function () {

  var server = 'http://localhost:8000';
  var model = 'daybed:examples:search:extent';


  var _session;
  function getSession() {
    _session = _session || Daybed.startSession(server, {anonymous: true});
    return _session;
  }


  function loadGeoJson() {
    return getSession()
      .then(function (session) {
        return session.getRecords(model, {
          format: 'application/vnd.geo+json',
        });
      });
  }


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
        return response.hits.hits.map(function (r) {
          return r._source;
        });
      });
  }


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



  var map = L.map('map')
    .setView([41.8, 12.5], 9);

  L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
      attribution: 'Map data &copy; OpenStreetMap contributors'
  }).addTo(map);

  L.control.sidebar('sidebar')
   .addTo(map)
   .show();

   React.render(
    React.createElement(ResultsList, {map: map}),
    document.getElementById('results'));


  loadGeoJson()
    .then(function (geojson) {
      L.geoJson(geojson, {
        pointToLayer: function(featureData, latlng) {
          return L.circle(latlng, 30, {color: 'purple', fillOpacity: 1.0});
        }
      }).addTo(map);
    });



})();
