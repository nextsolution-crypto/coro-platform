const test = require('node:test'); const assert = require('node:assert/strict'); const fs = require('node:fs'); const path = require('node:path');
const page = fs.readFileSync(path.join(__dirname, '[id]', 'page.tsx'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '[id]', 'report.module.css'), 'utf8');
const workspace = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
const workspaceCss = fs.readFileSync(path.join(__dirname, 'workspace.module.css'), 'utf8');

test('the UI exposes the governed lifecycle without client-side authorization shortcuts', () => {
  for (const route of ['submit-review','review','reject','approve','publish','revisions']) assert.match(page, new RegExp(route));
  assert.match(page, /lockVersion/); assert.match(page, /requestId: crypto\.randomUUID/); assert.doesNotMatch(page, /SUPER_ADMIN|user\.role/);
});
test('official PDF and closure export remain authenticated API actions', () => {
  assert.match(page, /versions\/\$\{version\}\/download/); assert.match(page, /closure-export/); assert.doesNotMatch(page, /storageKey/);
});
test('component responsive geometry has bounded grids and accessible touch targets', () => {
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/); assert.match(css, /@media\(max-width:720px\)/); assert.match(css, /min-height:44px/); assert.match(css, /overflow-wrap:anywhere/); assert.match(css, /focus-visible/);
});
test('portfolio and template governance use authenticated APIs without implicit client-side grants', () => {
  assert.match(workspace, /exercise-reports\/portfolio/);
  assert.match(workspace, /exercise-report-templates\/publish/);
  assert.match(workspace, /requestId: crypto\.randomUUID/);
  assert.doesNotMatch(workspace, /SUPER_ADMIN|user\.role|NETWORK_SUPERVISION_READ/);
});
test('portfolio cards and template forms remain component-responsive', () => {
  assert.match(workspaceCss, /repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(workspaceCss, /@media\(max-width:720px\)/);
  assert.match(workspaceCss, /min-height:44px/);
  assert.match(workspaceCss, /overflow-wrap:anywhere/);
});
