/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const contract = await import(pathToFileURL(path.join(__dirname, 'organization360-contract.mjs')));
  assert.deepEqual(contract.ORGANIZATION_360_TABS.map(([code]) => code), [
    'overview', 'users', 'clients', 'sites', 'capabilities', 'commercial', 'usage', 'security', 'audit-events',
  ]);
  const rendered = contract.renderTabListForContract();
  for (const [, label] of contract.ORGANIZATION_360_TABS) assert.match(rendered, new RegExp(`>${label}<`));
  assert.doesNotMatch(rendered, />Billing</);
  console.log('Organization 360 UI contract: PASS');
})().catch((error) => { console.error(error); process.exitCode = 1; });
