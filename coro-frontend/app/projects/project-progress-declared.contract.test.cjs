const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('les interfaces Projet présentent la valeur comme une progression déclarée', () => {
  const files = [
    'app/projects/[id]/page.tsx',
    'app/projects/page.tsx',
    'app/dashboard/page.tsx',
    'app/admin/projects/page.tsx',
  ];

  for (const file of files) {
    assert.match(read(file), /Progression déclarée/, file);
  }
});

test('la fiche Projet explique la provenance manuelle sans la confondre avec le score qualité', () => {
  const detail = read('app/projects/[id]/page.tsx');
  assert.match(detail, /Valeur manuelle persistée pour ce projet/);
  assert.match(detail, /ni calculée depuis les documents ni confondue avec le score qualité/);
  assert.doesNotMatch(detail, /Avancement des grandes étapes du projet/);
});
