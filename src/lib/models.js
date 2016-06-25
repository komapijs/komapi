'use strict';

// Dependencies
import path from 'path';
import recursiveReadDir from 'recursive-readdir-sync';
import _ from 'lodash';

// Exports
export default function loadModels(modelPath, app) {

    // Create a list of files
    let files = [];
    if (modelPath.endsWith('.js')) {
        files.push(modelPath);
    }
    else {
        files = recursiveReadDir(modelPath).filter((p) => p.endsWith('.js'));
    }

    // Handle the files
    files.forEach((file) => {
        file = path.resolve(file);
        const name = _.upperFirst(path.parse(file).name);
        const model = require.main.require(file)(app.orm);
        app.orm[name] = model;
    });
}