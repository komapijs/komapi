// Dependencies
import path from 'path';
import fs from 'fs';
import fileExists from 'file-exists';
import recursiveReadDir from 'recursive-readdir-sync';

// Exports
export default function findFiles(rootPath, recursive = true) {
  // Create a list of files
  let files = [];
  if (fileExists.sync(rootPath)) files.push(rootPath);
  else if (recursive) files = recursiveReadDir(rootPath).filter(p => p.endsWith('.js'));
  else files = fs.readdirSync(rootPath).filter(p => p.endsWith('.js')); // eslint-disable-line security/detect-non-literal-fs-filename
  return files.map(f => path.resolve(f));
}
