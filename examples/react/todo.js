/** @jsx React.DOM */

var model = 'daybed:examples:react:todo';
var server = 'https://daybed.lolnet.org';


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
    var self = this;

    var store = model + ':token'
    var token = localStorage.getItem(store);
    return Daybed.startSession(server, { token: token })
      .then(function (session) {
        localStorage.setItem(store, session.token);
        self.session = session;
      })
      .then(self.install)
      .then(function () {
        return self.session.getRecords(model);
      })
      .then(function (response) {
        var items = response.records.map(function (record) {
          return record.item;
        });
        self.setState({items: items});
      });
  },

  onTextChange: function(e) {
    this.setState({text: e.target.value});
  },

  handleSubmit: function(e) {
    e.preventDefault();

    var nextItems = this.state.items.concat([this.state.text]);
    var nextText = '';
    this.setState({items: nextItems, text: nextText});

    this.session.saveRecord(model, {item: this.state.text});
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
  },

  install: function () {
    var models = {};
    models[model] = {
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

    return this.session.saveModels(models);
  },

});

React.renderComponent(<TodoApp />, document.getElementById('todo'));
