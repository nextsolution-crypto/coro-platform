import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { aiV2Content } from '../lib/site/ai-v2-content.ts';

const root=process.cwd();
const component=readFileSync(join(root,'components/page/AiV2Page.tsx'),'utf8');
const page=readFileSync(join(root,'app/coro-ai/page.tsx'),'utf8');

test('CORO AI V2 keeps the approved bilingual structure and qualified claims',()=>{
 for(const locale of ['fr','en'] as const){const copy=aiV2Content[locale];assert.equal(copy.problems.length,4);assert.equal(copy.workflow.length,4);assert.equal(copy.uses.length,6);assert.equal(copy.trust.length,5);assert.equal(copy.faq.length,10)}
 assert.match(component,/localizedHref\('\/coro-knowledge',locale\)/);
 assert.match(component,/Exemple illustratif|Illustrative demonstration|demoLabel/);
 assert.match(page,/buildPageMetadata/);
});

test('all approved CORO AI images are present and integrated',()=>{
 const images=readdirSync(join(root,'public/images/Coro_AI')).filter(x=>x.endsWith('.webp'));
 assert.equal(images.length,9);
 for(const [file] of aiV2Content.fr.uses) assert.ok(images.includes(file));
 for(const file of ['coro-ai-gestionnaire-immobilier.webp','coro-ai-analyse-documentaire.webp','coro-ai-assistance-batiment.webp']) assert.match(component,new RegExp(file.replace('.','\\.')));
});
