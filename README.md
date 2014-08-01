# Daybed.js

A library to use Daybed easily.

## Example

Here is an example of how to use daybed in the context of a list of books you
would like to read.

First you need to create a session:

    var session = new Daybed.Session({
      hawkSession: hawkSession,
      url: 'http://daybed.spiral-project.org'
    })

And then create your model (and use it):

    var books = new Daybed.Model({
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
    }, session);

    books.add({
      title: "Critique de la raison numérique",
      author: "Dominique Mazuet, Delga",
      summary: "http://www.librairie-quilombo.org/spip.php?article5532"
    });

    books.save();
    // In this specific case, books.save() will create the definition and add
    // a new item to it. In case the definition already exists, it will check
    // it's consistent with the one defined here and if not the case will
    // error-out.

In case you know that the server already has a model defined for your books,
you can just reuse it without having to define it in your code:

    var books = new RemoteModel('books', session);
    books.all()
