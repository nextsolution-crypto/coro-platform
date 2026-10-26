import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import { knowledgeContent } from '../lib/site/knowledge-content.ts';
import { publicRoutes, staticSitemapRoutes } from '../lib/site/routes.ts';
import { visibleNavigation } from '../lib/site/navigation.ts';
import { isLegacyFooterVisible } from '../lib/site/v2-migration.ts';

const read = (p: string) => readFileSync(p, 'utf8');
function initializer(path: string, name: string): unknown {
  const src = read(path);
  const ast = ts.createSourceFile(path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression = '';
  ast.forEachChild(node => {
    if (ts.isVariableStatement(node)) for (const d of node.declarationList.declarations) {
      if (d.name.getText(ast) === name && d.initializer) expression = d.initializer.getText(ast);
    }
  });
  assert.ok(expression, `${path}: ${name}`);
  return JSON.parse(JSON.stringify(vm.runInNewContext(ts.transpile(`(${expression})`, { target: ts.ScriptTarget.ES2022 }))));
}
function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,shape(v)]));
  assert.equal(typeof value, 'string');
  assert.ok((value as string).trim());
  return 'text';
}

test('all three operational pages have complete English structures, not a navigation-only translation', () => {
  for (const path of ['sentinelle', 'coro-incident']) {
    const file = `app/${path}/page.tsx`;
    assert.deepEqual(shape(initializer(file, 'english')), shape(initializer(file, 'copy')), path);
    assert.ok(!read(file).includes('resolveAvailableLocale'));
  }
  const population = initializer('app/sentinelle-population/page.tsx', 'copy') as {fr:unknown;en:unknown};
  assert.deepEqual(shape(population.fr), shape(population.en));
  const ui = initializer('app/sentinelle-population/page.tsx', 'interfaceCopy') as {fr:unknown;en:unknown};
  assert.deepEqual(shape(ui.fr), shape(ui.en));
});

test('Knowledge and AI are implemented and discoverable in both languages with the V2 shell', () => {
  for (const id of ['knowledge', 'ai']) {
    const route = publicRoutes.find(r => r.id === id)!;
    assert.ok(route.implemented && route.fr && route.en && route.sitemap);
    assert.ok(staticSitemapRoutes.includes(route));
    assert.equal(isLegacyFooterVisible(route.path), false);
    for (const locale of ['fr', 'en'] as const) {
      assert.ok(visibleNavigation(locale).flatMap(g=>g.items).some(i=>i.id===id));
      const content = knowledgeContent[id as 'knowledge'|'ai'][locale];
      assert.ok(content.sections.length && content.faq.length && content.limits);
    }
  }
});

test('building documentation is distinguished from compliance and links to real Knowledge and AI pages', () => {
  const page = read('app/portail-client/page.tsx');
  assert.ok(page.includes('Documents de conformité') && page.includes('Documentation technique'));
  assert.ok(page.includes("localizedHref('/coro-knowledge', l)") && page.includes("localizedHref('/coro-ai', l)"));
  assert.ok(page.includes('Un fichier conservé n’est pas nécessairement analysable'));
  assert.ok(page.includes('not included in the validated Client V1 commercial scope'));
});

test('source eligibility and human verification remain explicit in both languages', () => {
  assert.match(knowledgeContent.knowledge.fr.limits, /ne sont pas exécutées/);
  assert.match(knowledgeContent.knowledge.en.limits, /not automatically readable/);
  assert.match(knowledgeContent.ai.fr.limits, /incomplète ou erronée/);
  assert.match(knowledgeContent.ai.en.limits, /human|professional|judgement|emergency decisions/);
});
