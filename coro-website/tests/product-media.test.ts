import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const component = readFileSync(join(root, 'components/ProductCompositions.tsx'), 'utf8');
const media = [
  '/images/solutions/coro-gestion-documentaire.webp',
  '/images/solutions/en/coro-document-management.webp',
  '/images/solutions/coro-gestion-projets.webp',
  '/images/solutions/en/coro-project-management.webp',
  '/images/solutions/coro-performance-objectifs.webp',
  '/images/solutions/en/coro-performance-objectives.webp',
  '/images/solutions/portail-client/coro-portail-client-tableau-de-bord.webp',
  '/images/solutions/portail-client/coro-portail-client-batiments.webp',
  '/images/solutions/portail-client/coro-portail-client-carte.webp',
  '/images/solutions/portail-client/coro-portail-client-activites.webp',
  '/images/solutions/portail-client/coro-portail-client-cycle-documentaire.webp',
  '/images/solutions/portail-client/coro-portail-client-espace-conseiller.webp',
];

test('all historical product media remain present and integrated', () => {
  assert.match(component, /from "next\/image"/);
  for (const source of media) {
    assert.ok(existsSync(join(root, 'public', source.slice(1))), `${source} is missing`);
    assert.ok(component.includes(source), `${source} is not integrated`);
  }
});
