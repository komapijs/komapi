'use strict';

// Dependencies
import test from 'ava';
import findFiles from '../../src/lib/findFiles';

// Tests
test('finds files recursively by default', async t => {
    let files = findFiles('../fixtures/files');
    t.is(files.length, 4);
});
test('can find files non-recursively', async t => {
    let files = findFiles('../fixtures/files', false);
    t.is(files.length, 2);
});