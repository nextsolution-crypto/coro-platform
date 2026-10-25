import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const files = [
  new URL('./page.tsx', import.meta.url),
  new URL('../sentinelle/[buildingId]/population/PopulationOperationalMap.tsx', import.meta.url),
];

test('Leaflet is bundled locally and no runtime code depends on UNPKG', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
  );
  assert.equal(packageJson.dependencies.leaflet, '1.9.4');

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.match(source, /import\(['"]leaflet['"]\)/);
    assert.doesNotMatch(source, /unpkg\.com/i);
  }
});

test('OSM tiles use the current HTTPS endpoint and retain attribution', async () => {
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.match(source, /https:\/\/tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
    assert.doesNotMatch(source, /\{s\}\.tile\.openstreetmap\.org/);
    assert.match(source, /OpenStreetMap contributors/);
  }
});
