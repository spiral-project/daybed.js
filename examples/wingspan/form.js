/** @jsx React.DOM */

var ModelForm = React.createClass({

    getInitialState: function () {
        return {
            fields: {},
            record: {},
            errors: {},
        };
    },

    componentDidMount: function() {
        this.session = new Daybed.Session(this.props.server);

        this.session.getDefinition(this.props.model)
            .then(function (definition) {
                var fields = {};
                _.each(definition.fields, function (field) {
                    fields[field.name] = _fieldSchema(field);
                });
                this.setState({fields: fields});
            }.bind(this));

        function _fieldSchema(field) {
            return {
                dataType: 'text',
                label: field.label,
                name: field.name
            };
        }

        this.validate = _.debounce(this.validate, 500);
    },

    render: function () {
        var errors = this.state.errors;

        var controls = _.map(this.state.fields, function (fieldInfo) {
            var msg = this.state.busy ? '' : errors[fieldInfo.name] || '',
                fieldValid = [!msg, msg],
                fieldValue = this.state.record[fieldInfo.name];
            return (
                <AutoField
                    fieldInfo={fieldInfo}
                    value={fieldValue}
                    onChange={_.partial(this.onFieldChange, fieldInfo.name)}
                    isValid={fieldValid} />
            );
        }.bind(this));

        return <div>{controls}</div>;
    },

    onFieldChange: function (fieldName, value) {
        this.state.record[fieldName] = value;
        this.setState({record: this.state.record});
        this.validate();
    },

    validate: function() {
        this.setState({busy: true});
        this.session.validateRecord(this.props.model, this.state.record)
            .catch(function (error) {
                var errors = {};
                _.each(error.response.errors, function (invalid) {
                    errors[invalid.name] = invalid.description;
                });
                this.setState({busy: false, errors: errors});
            }.bind(this));
    },
});


var AutoField = WingspanForms.AutoField;

var model = 'todo';
var server = 'https://daybed.lolnet.org';

React.renderComponent(
    <div className="MyForm">
        <ModelForm server={server} model={model} />
    </div>,
    document.getElementById('wishlist')
);
