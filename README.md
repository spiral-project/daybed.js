# daybed.js

A library to use [Daybed](http://daybed.readthedocs.org) in your Javascript
applications.

[![NPM Version](https://img.shields.io/npm/v/daybed.js.svg?style=flat)](https://npmjs.org/package/daybed.js)
[![Build Status](https://travis-ci.org/spiral-project/daybed.js.png?branch=master)](https://travis-ci.org/spiral-project/daybed.js)


## Usage

In the browser, just include the source file:

```html
  <script src="//spiral-project.github.io/daybed.js/build/daybed.js"></script>
```

In node, just require the package:

```javascript
  var Daybed = require('daybed.js');
```

## Rationale

Note that **Daybed** is a REST backend, and does not require any particular library
to be used in your applications.

**daybed.js** brings some helpers to ease the manipulation of sessions and asynchronous
operations.

We heavily take advantage of [Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).


## Example


### Start a session

First, we start a new session on Daybed, and keep the token as if it was an *admin* password.

```javascript

    var server = 'https://daybed.lolnet.org';

    var sessionPromise = Daybed.startSession(server)
      .then(function (session) {
        console.log("Keep this somewhere safe " + session.token);
        return session;
      });

```

Later, you will be able to re-use *admin* token you obtained :

```javascript

    var sessionPromise = Daybed.startSession({ token: 'q89ryh..dcc' })
      .then(function (session) {
        console.log("Authenticated!");
        return session;
      })
      .catch(function (error) {
        console.log("Failed!");
      });
```

**Note**: The ``sessionPromise`` object is not a ``Session`` object.

You can build a ``Session`` object yourself:

```javascript

    var sessionObject = new Daybed.Session(server, { token: 'q89ryh..dcc' });

```

Or get it out of the promise:

```javascript

    var sessionObject;
    sessionPromise
      .then(function (session) {
          sessionObject = session;
      });

```

### Setup

As the main developper of your app, it's common to start by defining a *model*
on the Daybed server.

Let's say you want to build an app to list the books you would like to read.


```javascript

    var books = {
      definition: {
        title: 'book',
        description: "The list of books to read",
        fields: [{
          name: "title",
          type: "string",
          label: "Title",
        },
        {
          name: "author",
          type: "string",
          label: "Author"
        },
        {
          name: "summary",
          type: "string",
          label: "Summary"
        }]
      }
    };

    var modelId = 'myapp:books';

    sessionPromise
      .then(function (session) {
        return session.saveModel(modelId, books);
      })
      .then(function (created) {
        console.log('Model created', created);
      })
      .catch(function (error) {
        console.error('An error occured', error);
      });

```

As a model owner, you can adjust the permissions. For example, you can decide
that everyone can create, read, edit and delete their own records :

```javascript

    sessionPromise
      .then(function (session) {
        return session.savePermissions(modelId, {
          'Everyone': ['create_record', 'read_own_records', 'delete_own_records',
                       'read_definition']
      })
      .then(function (permissions) {
        console.log('Permissions set', permissions)
      });

```

**You're done** !

You can now implement your application, and let your users manage their records !


### In your application

Let's say, we want each user to store her session token in the local storage.
The first time, a new token will be created :

```javascript

    var token = localStorage.getItem('myapp:books:token');
    var sessionPromise = Daybed.startSession(server, { token: token })
      .then(function (session) {
        localStorage.setItem('myapp:books:token', session.token);
        return session;
      });

```

Fetch the list of records :

```javascript

    var modelId = 'myapp:books';

    sessionPromise
      .then(function (session) {
        return session.getRecords(modelIds)
      })
      .then(function (records) {
        console.log(records.length + ' record(s).');
      });

```

Create new records :

```javascript

    var book = {
      title: "Critique de la raison numérique",
      author: "Dominique Mazuet, Delga",
      summary: "http://www.librairie-quilombo.org/spip.php?article5532"
    };

    sessionPromise
      .then(function (session) {
        return session.saveRecord(modelId, book)
      })
      .catch(function (error) {
         console.error('An error occured', error);
      });

```


### A word about tokens

Tokens are your authentication credentials, you can share yours, by using
URL location hash for example (instead of localStorage) :

```javascript

    var token = window.location.hash.slice(1);
    Daybed.startSession({ token: token })
      .then(function (session) {
        window.location.hash = session.token;
      });

```

This way, each user can share her identity on several devices, and even share
her
own privileges and collaborate with the entire world!


You can also create new ones and assign them to specific permissions:


```javascript

    var sessionObject;
    sessionPromise
      .then(function (session) {
        sessionObject = session;
        return Daybed.getToken();
      })
      .then(function(infos) {
        console.log(infos.token + ' will be allowed to delete any record');

        var permissions = {};
        permissions[infos.credentials.id] = ['delete_all_records'];
        sessionObject.savePermissions(modelId, permissions);
      });

```


# See also

Check out [backbone-daybed](https://github.com/spiral-project/backbone-daybed),
which brings Backbone.js helpers with *jQuery* instead of *daybed.js*.


# References

* [Promises error handling](http://www.html5rocks.com/en/tutorials/es6/promises/#toc-error-handling)
* Optional authentication relies on [Hawk](https://github.com/hueniverse/hawk)
* Tokens are manipulated with [SJCL](http://bitwiseshiftleft.github.io/sjcl/)
