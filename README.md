# Daybed.js

A library to use [Daybed](http://daybed.readthedocs.org) in your Javascript
applications.

[![Build Status](https://travis-ci.org/spiral-project/daybed.js.png?branch=master)](https://travis-ci.org/spiral-project/daybed.js)


## Rationale

**Daybed** is a REST backend, and does not require any particular library
to be used in your applications.

However, since (*however optional*) authentication relies on Hawk, we built some
helpers to ease the manipulation of session tokens.

We use JavaScript Promises since most operations are run asynchronously.

## Example


### Setup

As the main developper of your app, it's common to start by defining a *model*
on the Daybed server.

Let's say you want to build an app to list the books you would like to read.

First, we start a new session on Daybed, and keep the token as if it was an *admin* password.

```javascript

    var server = 'http://daybed.spiral-project.org/v1/';
    var session = Daybed.startSession(server)
                        .then(function (session) {
                          console.log("Keep this somewhere safe " + session.token);
                        });

```

Then, you can keep using the same session object, or create a new one reusing
the *admin* token you obtained :

```javascript

    var session = Daybed.startSession(server, { token: 'q89ryh..dcc' });

```

As the application author, you define a new model for your books list :

```javascript

    var books = new Daybed.Model({
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
    });

    var modelId = 'myapp:books';

    books.save({id: modelId, session: session})
      .then(function (created) {
        console.log('Model created', created);
      })
      .catch(function (error, xhr) {
        console.error('An error occured', error, xhr);
      });

```

As a model owner, you can adjust the permissions. For example, you can decide
that everyone can create, read, edit and delete their own records :

```javascript

    session.patchPermissions(modelId, {
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
    var session = Daybed.startSession({ token: token })
                        .then(function (session) {
                          localStorage.setItem('myapp:books:token', session.token);
                        });

```

Fetch the list of records :

```javascript


    var books;
    var modelId = 'myapp:books';

    session.loadModel(modelId)
           .then(loaded);

    function loaded(model) {
      books = model;
      var records = books.records();
      console.log(records.length + ' record(s).');
    }

```

Create new records :

```javascript

    console.log('Current session ', books.session);

    books.add({
      title: "Critique de la raison numérique",
      author: "Dominique Mazuet, Delga",
      summary: "http://www.librairie-quilombo.org/spip.php?article5532"
    });

    books.save()
         .catch(function (error, xhr) {
           console.error('An error occured', error, xhr);
         });

```


### A word about tokens

Tokens are your authentication credentials, you can share yours, by using
URL location hash for example (instead of localStorage) :

```javascript

    var token = window.location.hash.slice(1);
    var session = Daybed.startSession({ token: token })
                        .then(function (session) {
                          window.location.hash = session.token;
                        });

```

This way, each user can share her identity on several devices, and even share
her 
own privileges and collaborate with the entire world!


You can also create new ones and assign them to specific permissions:


```javascript

    Daybed.getToken()
          .then(addDeletePermissions);

    function addDeletePermissions(credentials) {
      var token = credentials.token;
      console.log(token + ' will be allowed to delete any record');

      var permissions = {};
      permissions[token] = ['delete_all_records'];
      session.patchPermissions(modelId, permissions);
    }

```


# References

* [Promises error handling](http://www.html5rocks.com/en/tutorials/es6/promises/#toc-error-handling)
