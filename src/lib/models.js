// Dependencies
import path from 'path';
import recursiveReadDir from 'recursive-readdir-sync';

// Exports
export default function loadModels(modelPath, app) {
  const models = {};
  let files = [];
  if (modelPath.endsWith('.js')) {
    files.push(modelPath);
  } else {
    files = recursiveReadDir(modelPath).filter(p => p.endsWith('.js'));
  }

  // Handle the files
  files.forEach((file) => {
    file = path.resolve(file); // eslint-disable-line no-param-reassign
    const model = require.main.require(file)(app.orm, app);
    models[model.name] = model;
  });
  return models;
}
