const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');

assert.match(page, /\/display-authority/);
assert.match(page, /DISPLAY_READ/);
assert.match(page, /displayBuildingIds/);
assert.match(
  page,
  /Les droits d'urgence ne\s+sont pas delegables ici/,
);
assert.match(page, /Configurer Display/);

console.log('display authority administration contract: PASS');
