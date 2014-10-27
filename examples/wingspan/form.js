/** @jsx React.DOM */

var ModelForm = React.createClass({

    getInitialState: function () {
        return {
            definition: {},
            record: {},
            errors: {},
        };
    },

    componentDidMount: function() {
        this.fields = {};

        this.session = new Daybed.Session(this.props.server);

        this.session.getDefinition(this.props.model)
            .then(function (definition) {
                _.each(definition.fields, function (field) {
                    this.fields[field.name] = _fieldSchema(field);
                }.bind(this));
                this.setState({definition: definition});
            }.bind(this));

        function _fieldSchema(field) {
            var formField = {
                dataType: 'text',
                label: field.label,
                name: field.name
            };
            if (/date|boolean/.test(field.type)) {
                formField.dataType = field.type;
            }
            return formField;
        }

        this.validate = _.debounce(this.validate, 500);
    },

    render: function () {
        var errors = this.state.errors;

        var controls = _.map(this.fields, function (fieldInfo) {
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

        return (
            <div>
                <h2>{this.state.definition.title}</h2>
                <p>{this.state.definition.description}</p>
                <div>{controls}</div>
            </div>
        );
    },

    onFieldChange: function (fieldName, value) {
        this.state.record[fieldName] = value;
        this.setState({record: this.state.record});
        this.validate();
    },

    validate: function() {
        this.setState({busy: true, errors: {}});
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

var model = 'daybed:examples:ticket';
var server = 'https://daybed.lolnet.org';


WingspanForms.ControlCommon.attachFormTooltips($(document.body));

React.renderComponent(
    <div className="MyForm">
        <ModelForm server={server} model={model} />
    </div>,
    document.getElementById('ticket-form')
);
