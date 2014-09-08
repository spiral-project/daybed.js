/** @jsx React.DOM */

var TodoList = React.createClass({
  render: function() {
    var createItem = function(itemText) {
      return <li>{itemText}</li>;
    };
    return <ul>{this.props.items.map(createItem)}</ul>;
  }
});


var TodoApp = React.createClass({

  getInitialState: function() {
    return {items: [], text: ''};
  },

  componentDidMount: function() {
    var model = this.model = 'daybed:examples:react:todo';

    this.connect()
    .then(function () {
      return this.session.getRecords(model);
    }.bind(this))
    .then(function (response) {
      this.load(response.records);
    }.bind(this));
  },

  connect: function () {
    var server = 'https://daybed.lolnet.org';

    this.session = null;

    // Reuse previous sessions using localStorage
    var token = localStorage.getItem(this.model + ':token');
    var connect = Daybed.startSession(server, { token: token })
      .then(function (session) {
        this.session = session;
        localStorage.setItem(this.model + ':token', session.token);
        console.log('Session started', session);
      }.bind(this))
      .catch(function (e) {
        console.error('Could not start session.', e);
      });

    return this.install(connect);
  },

  install: function (connect) {
    var models = {};
    models[this.model] = {
      definition: {
        title: 'todo',
        description: 'Daybed + React',
        fields : [
          {name: 'item', type: 'string'},
        ],
      },
      permissions: {
        'Everyone': ['create_record', 'read_own_records', 'read_definition']
      }
    };

    var install = connect.then(function () {
      return this.session.saveModels(models);
    }.bind(this));

    return install;
  },

  load: function (records) {
    var items = records.map(function (record) {
      return record.item;
    });
    this.setState({items: items});
  },

  onTextChange: function(e) {
    this.setState({text: e.target.value});
  },

  handleSubmit: function(e) {
    e.preventDefault();

    var nextItems = this.state.items.concat([this.state.text]);
    var nextText = '';
    this.setState({items: nextItems, text: nextText});

    this.session.saveRecord(this.model, {item: this.state.text});
  },

  render: function() {
    return (
      <div>
        <h3>TODO</h3>
        <TodoList items={this.state.items} />
        <form onSubmit={this.handleSubmit}>
          <input onChange={this.onTextChange} value={this.state.text} />
          <button>{'Add #' + (this.state.items.length + 1)}</button>
        </form>
      </div>
    );
  }
});
React.renderComponent(<TodoApp />, document.getElementById('todo'));
