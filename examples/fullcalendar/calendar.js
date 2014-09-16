$(document).ready(function() {

    var server = 'https://daybed.lolnet.org';
    var model = 'daybed:examples:fullcalendar';

    var _calendar,
        _session;

    connect()
      .then(install)
      .then(init);

    //
    // Get session from URL hash, or create new one
    //
    function connect() {
        var token = window.location.hash.slice(1);
        return Daybed.startSession(server, { token: token })
          .then(function (session) {
            _session = session;
            window.location.hash = session.token;
          })
          .catch(function (e) {
            console.error("Could not start session", e);
          });
    }

    //
    // Initialize fullCalendar
    //
    function init() {
        _calendar = $('#calendar').fullCalendar({
            header: {
                left: 'prev,next today',
                center: 'title',
                right: 'month,agendaWeek,agendaDay'
            },
            events: loadEvents,

            editable: true,
            selectable: true,
            select: onSelect,
            eventClick: eventDialog,
            eventDrop: eventDropOrResize,
            eventResize: eventDropOrResize
        });
    }

    //
    // Load existing records from backend
    //
    function loadEvents(start, end, timezone, callback) {
        _session.getRecords(model)
        .then(function (response) {
            callback(response.records);
        })
        .catch(function (e) {
            console.log("Could not load events", e);
        });
    }

    //
    // Create event on user selection
    //
    function onSelect(startDate, endDate) {
        eventDialog({
            start: startDate.format(),
            end: endDate.format(),
        });
    }

    //
    // Update events when moved/resized
    //
    function eventDropOrResize(fcEvent) {
        var event = jQuery.extend({}, fcEvent);  // clone
        event.start = event.start.format();
        event.end = event.end.format();

        _session.saveRecord(model, event)
        .catch(function (e) {
            console.error("Could not save event", e);
        });

        _calendar.fullCalendar('updateEvent', fcEvent);
    }

    //
    // jQuery UI dialog to create/delete/save
    //
    function eventDialog(event) {
        var isNew = event.title === undefined;

        var $dialog = $('#eventDialog').dialog({
            modal: true,
            title: isNew ? 'New Event' : 'Edit ' + event.title,
            open: function () {
                $(this).find('#title').val(event.title);
            },
            buttons: dialogActions()
        });


        function dialogActions() {
            var actions = {
                'Cancel': function () {
                    $dialog.dialog('close');
                },
            };

            if (!isNew) {
                actions['Delete'] = function () {
                    _session.deleteRecord(model, event.id)
                    .catch(function (e) {
                        console.error("Could not delete event", e);
                    });

                    _calendar.fullCalendar('removeEvents', event.id);
                    $dialog.dialog('close');
                };
            }

            actions['Save'] = function () {
                event['title'] = $dialog.find('#title').val();

                _session.saveRecord(model, event)
                .then(function (response) {
                    $dialog.dialog('close');

                    event.id = response.id;
                    var action = isNew ? 'renderEvent' : 'updateEvent';
                    _calendar.fullCalendar(action, event);
                })
                .catch(function (e) {
                    console.error("Could not save event", e);
                });
            };

            return actions;
        }
    }

    //
    // Create Daybed models if missing
    //
    function install() {
        var models = {};
        models[model] = {
          definition: {
            title: 'Daybed Calendar',
            description: 'Daybed + Fullcalendar',
            fields : [
              {name: 'title', type: 'string'},
              {name: 'start', type: 'datetime'},
              {name: 'end', type: 'datetime', required: false},
            ],
          },
          permissions: {
            'Everyone': ['create_record', 'read_definition',
                         'read_own_records', 'update_own_records',
                         'delete_own_records']
          }
        };

        return _session.saveModels(models)
                       .catch(function (e) { console.warn(e); });
    }
});
