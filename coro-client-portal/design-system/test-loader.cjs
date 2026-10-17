/* eslint-disable @typescript-eslint/no-require-imports */
// Chargeur minimal pour les tests du design system : transpile .ts/.tsx à la volée, ignore les imports .css.
// (Même approche que les autres tests .cjs du projet : aucune dépendance de test supplémentaire.)
const fs = require('node:fs');
const ts = require('typescript');

const compile = (module, filename) => {
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  module._compile(out, filename);
};
require.extensions['.ts'] = compile;
require.extensions['.tsx'] = compile;
require.extensions['.css'] = () => {};

module.exports = {};
