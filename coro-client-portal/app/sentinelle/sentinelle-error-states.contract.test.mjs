import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const historySource = await readFile(new URL('./[buildingId]/historique/page.tsx', import.meta.url), 'utf8');
const resilienceSource = await readFile(new URL('./[buildingId]/resilience/page.tsx', import.meta.url), 'utf8');
const reportsSource = await readFile(new URL('./[buildingId]/rapports/page.tsx', import.meta.url), 'utf8');

test('history failures remain distinct from a legitimate empty history', () => {
  assert.match(historySource, /setError\("Impossible de charger l'historique/);
  assert.match(historySource, /role="alert"/);
  assert.match(historySource, /Réessayer/);
  assert.match(historySource, /setData\(null\)/);
});

test('resilience and snapshot failures are explicit and retryable', () => {
  assert.match(resilienceSource, /Impossible de charger l'indice de résilience/);
  assert.match(resilienceSource, /Impossible de charger l'historique de résilience/);
  assert.match(resilienceSource, /Le snapshot n'a pas été créé/);
  assert.match(resilienceSource, /if \(!res\.ok\) throw new Error/);
  assert.match(resilienceSource, /role="alert"/);
});

test('advanced report list and detail failures are not displayed as empty data', () => {
  assert.match(reportsSource, /Impossible de charger les rapports d'évacuation/);
  assert.match(reportsSource, /Impossible de charger ce rapport détaillé/);
  assert.match(reportsSource, /role="alert"/);
  assert.match(reportsSource, /Réessayer/);
});
