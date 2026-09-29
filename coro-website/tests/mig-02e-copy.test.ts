import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { productContent } from '../lib/site/product-content.ts';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
/** Public content only: the product content the pages render, plus the page-owned copy objects. Comments and tests are not inspected. */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const publicCopy = (route: 'projects' | 'documents', file: string) => JSON.stringify(productContent[route]) + '\n' + strip(read(file));

test('Projects public copy has no Network, target-architecture, implementation-state or meta-statement wording', () => {
  const copy = publicCopy('projects', 'app/gestion-de-projets/page.tsx');
  assert.doesNotMatch(copy, /Network/);
  assert.doesNotMatch(copy, /architecture visée|architecture direction|target architecture|future architecture|architecture cible/i);
  assert.doesNotMatch(copy, /code actuel|current code|le code|the code/i);
  assert.doesNotMatch(copy, /n’est (?:pas )?annoncée? ici|n’est pas annoncé|not announced|is claimed|is not claimed|not an automatic current capability/i);
  assert.doesNotMatch(copy, /parcours applicatifs|application flows/i);
});

test('Projects: the boundary describes the current product only, and Planning/Booking headings are customer-facing', () => {
  for (const [locale, boundary] of [['fr', 'Planning et Booking sont intégrés à la gestion opérationnelle des mandats.'], ['en', 'Planning and Booking belong to mandate operations.']] as const) assert.equal(productContent.projects[locale].boundary, boundary);
  assert.deepEqual(productContent.projects.fr.capabilities.map((c) => c.title), ['Mandats et activités', 'Planning des ressources', 'Réservations et affectations', 'Heures et suivi']);
  assert.deepEqual(productContent.projects.en.capabilities.map((c) => c.title), ['Mandates and activities', 'Resource planning', 'Bookings and assignments', 'Hours and tracking']);
  for (const locale of ['fr', 'en'] as const) for (const c of productContent.projects[locale].capabilities) assert.doesNotMatch(c.title + ' ' + c.text, /confirmé|confirmed/i, 'no status wording in headings');
});

test('Projects: no claim beyond the current Planning/Booking capability (no real-time, conflict detection, Outlook, intelligent scheduling, auto reassignment, client rescheduling, multi-adviser)', () => {
  const copy = publicCopy('projects', 'app/gestion-de-projets/page.tsx');
  assert.doesNotMatch(copy, /temps réel|real-time|real time|conflit|conflict|Outlook|intelligent|automatique|automatic|multi-conseiller|multi-advis|disponibilité en direct|live availability|reprogramm(?:er|ation) par le client|client rescheduling/i);
});

test('Documents public copy has no development, audit or implementation-state wording', () => {
  const copy = publicCopy('documents', 'app/gestion-documentaire/page.tsx');
  assert.doesNotMatch(copy, /générateurs actuels|current generators|catalogue historique|historical catalogue|historical document|promesse commerciale|commercial promise/i);
  assert.doesNotMatch(copy, /code actuel|current code|doit être validé|must be validated/i);
});

test('Documents: available plans, Phase 2 plans and the no-guarantee principle are preserved in customer-facing wording', () => {
  assert.equal(productContent.documents.fr.boundary, 'Les plans PMU, PSI et PCA sont disponibles dans CORO. Les plans PGC, PRA et PUE sont prévus en Phase 2. CORO soutient le travail professionnel sans garantir à lui seul la conformité.');
  assert.equal(productContent.documents.en.boundary, 'The ERP, FSP and BCP plans are available in CORO. The CMP, DRP and EEP plans are planned for Phase 2. CORO supports professional work but does not itself guarantee compliance.');
  const copy = publicCopy('documents', 'app/gestion-documentaire/page.tsx');
  assert.doesNotMatch(copy, /43 procédures|43 procedures|conformité automatique(?! de)|automatic (?:regulatory )?compliance(?! claims)|certifi/i);
});

test('CTA intent model: heroes discover the product, the end of every page requests a demonstration, Client adds the existing-user login', () => {
  const perf = read('app/performance-objectifs/page.tsx');
  assert.match(perf, /demo: 'Demander une démonstration'/);
  assert.match(perf, /demo: 'Request a demonstration'/);
  assert.match(perf, /primary=\{\{ label: t\.demo, href: demo \}\}/);
  assert.match(perf, /<Button href=\{demo\} surface="dark">\{p\.cta\}<\/Button>/, 'the hero keeps the product-discovery label');
  assert.match(read('app/gestion-documentaire/page.tsx'), /Demander une démonstration/);
  assert.match(read('app/gestion-de-projets/page.tsx'), /ctaPrimary: 'Demander une démonstration'/);
  assert.match(read('app/portail-client/page.tsx'), /primary=\{\{ label: t\.demo, href: demo \}\} secondary=\{\{ label: t\.access, href: LOGIN \}\}/);
});
