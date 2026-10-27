const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(__dirname, 'ProjectFiles.tsx'), 'utf8');
assert.match(source, /filesError/);
assert.match(source, /role="alert"/);
assert.match(source, /R[eé]essayer/);
assert.match(source, /filesRequestRef/);
assert.doesNotMatch(source, /window\.open\(file\.url/);
assert.match(source, /project-files\/\$\{file\.id\}\/content/);
console.log('ProjectFiles contract: PASS');
