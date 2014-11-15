var model = 'daybed:examples:game:score';
var server = 'https://daybed.io';


// Anonymous session
var session = new Daybed.Session(server);

// Show scores on startup
refreshScores();


function publishScore(score) {
  // Ignore null scores
  if (score <= 0)
    return;

  var gamer = document.getElementById("gamer").value;

  // Publish!
  session.saveRecord(model, {
    gamer: gamer || 'Anonymous',
    score: score
  })
  .then(function () {
    refreshScores();
  });
}


function refreshScores() {
  //
  // Use ElasticSearch to get the 10 highest scores
  //
  var query = {
    size: 10,
    sort: [{score: {order: "desc"}}]
  };
  session.searchRecords(model, query)
    .then(function (results) {
      // Build score list in HTML
      var top10 = '';
      for (var i=0, n=results.hits.hits.length; i<n; i++) {
        var s = results.hits.hits[i]._source;
        top10 += ('<li><strong>' + s.score + '</strong> ' +
                  s.gamer + ' (' + s.date + ')</li>');
      }
      document.getElementById('top10').innerHTML = top10;
      document.getElementById('total').textContent = results.hits.total;
    });
}


//
// Daybed model to store game scores.
// (function ran manually in inspector only once)
function install() {
  var scoreModel = {
    definition: {
      title: 'Daybed Game Score',
      description: 'Daybed + Phaser',
      fields : [
        {name: 'gamer', type: 'string'},
        {name: 'date', type: 'date', autonow: true},
        {name: 'score', type: 'int'},
      ],
    },
    permissions: {
      'Everyone': ['create_record', 'read_all_records']
    }
  };

  Daybed.startSession(server)
  .then(function (session) {
    console.log("Admin token", session.token);
    return session.saveModel(model, scoreModel);
  });
}
