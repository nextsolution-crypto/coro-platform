const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

const source = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
assert.match(source, /timeZone: 'UTC'/, 'civil dates must render in their stored calendar day');
assert.match(source, /clientRequestId: newRequestId\(\)/, 'creates must carry a stable retry key');
assert.match(source, /lockVersion: editingEntry\.lockVersion/, 'updates must carry concurrency version');
assert.match(source, /params: \{ lockVersion: entry\.lockVersion \}/, 'deletes must carry concurrency version');
assert.match(source, /role="alert"/, 'failures must be visible and accessible');
assert.match(source, /sequence !== requestSequence\.current/, 'stale read responses must be ignored');
console.log('Timelog frontend contract: PASS');
