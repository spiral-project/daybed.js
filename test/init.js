var isBrowser = (typeof process === 'undefined' || process.title !== 'node');

if (isBrowser) {
    assert = chai.assert;
}
else {
    assert = require('chai').assert;
    sinon = require('sinon');
    Daybed = require('..');
}
