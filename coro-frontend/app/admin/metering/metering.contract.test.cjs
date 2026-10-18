const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const contract = await import('./metering-contract.mjs');
  assert.equal(contract.METERING_ROUTE, '/admin/metering');
  assert.deepEqual(contract.METERING_RESULT_QUALITIES, ['CANONICAL', 'DERIVED']);
  const page = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
  assert.match(page, /ne servent pas à la facturation/i);
  assert.match(page, /Début de la période d’observation/);
  assert.match(page, /Motif de la correction/);
  assert.doesNotMatch(page, /Invoice|Payment|Billable event/);
  console.log('Phase 3C metering frontend contract: PASS');
})().catch((error) => { console.error(error); process.exit(1); });
