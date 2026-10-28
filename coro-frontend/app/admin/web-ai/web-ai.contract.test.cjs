const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const page = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
assert.match(page, /\/admin\/v1\/web-ai\/dashboard/);
assert.match(page, /Bedrock réel/);
assert.match(page, /ne permet pas d’activer Bedrock/);
assert.doesNotMatch(page, /conversation\.content|contactEmail|contactName/);
console.log('web-ai admin contract: PASS');
