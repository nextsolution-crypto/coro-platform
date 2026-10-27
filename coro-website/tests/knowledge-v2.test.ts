import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { knowledgeV2Content } from '../lib/site/knowledge-v2-content.ts';

const root = process.cwd();
const component = readFileSync(join(root, 'components/page/KnowledgeV2Page.tsx'), 'utf8');
const page = readFileSync(join(root, 'app/coro-knowledge/page.tsx'), 'utf8');

test('Knowledge V2 keeps the approved bilingual structure and claims', () => {
  for (const locale of ['fr', 'en'] as const) {
    const copy = knowledgeV2Content[locale];
    assert.equal(copy.categories.length, 6);
    assert.equal(copy.uses.length, 3);
    assert.equal(copy.faq.length, 8);
    assert.equal(copy.ecosystem.length, 6);
    assert.match(copy.governanceNote, /not automatically|n’est pas automatiquement/);
  }
  assert.match(component, /coro-knowledge-interface-bibliotheque-documents\.webp/);
  assert.match(component, /coro-knowledge-interface-fiche-document\.webp/);
  assert.match(component, /coro-knowledge-interface-assistant-ia\.webp/);
  assert.match(component, /localizedHref\('\/coro-ai',locale\)/);
  assert.match(page, /buildPageMetadata/);
});

test('all approved Knowledge image assets are present', () => {
  const images = readdirSync(join(root, 'public/images/Coro_Knowledge')).filter((file) => file.endsWith('.webp'));
  assert.equal(images.length, 14);
  for (const category of knowledgeV2Content.fr.categories) assert.ok(images.includes(category[0]));
});
