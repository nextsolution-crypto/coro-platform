const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const page = fs.readFileSync(path.join(root, 'page.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, '../../../components/layout/AppLayout.tsx'), 'utf8');

assert.match(layout, /Test Scenario Pilot/);
assert.match(layout, /\/admin\/test-scenario-pilots/);
assert.match(page, /\/admin\/v1\/test-scenario-pilots/);
assert.match(page, /eligible-targets/);
assert.match(page, /Créer le scénario/);
assert.match(page, /PASS/);
assert.match(page, /FAIL/);
assert.match(page, /BLOCKED/);
assert.match(page, /PRODUCTION_DEMO/);
assert.match(page, /Une coche\s+représente une preuve exécutée/u);
assert.doesNotMatch(page, /localStorage|sessionStorage/);

console.log('pilot scenario SuperAdmin contract: PASS');
