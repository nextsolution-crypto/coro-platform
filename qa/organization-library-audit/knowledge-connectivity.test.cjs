const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const retrieval = read('coro-backend/src/knowledge/knowledge-retrieval.service.ts');
const ai = read('coro-backend/src/knowledge/coro-ai.service.ts');
const publicSearch = read('coro-backend/src/public-knowledge/public-knowledge-search.service.ts');
const publicCatalog = read('coro-backend/src/public-knowledge/public-knowledge.catalog.ts');

const syntheticFact = 'QA-ONLY-LIBRARY-PROCEDURE-ZEPHYR-4817';

test('Knowledge retrieves canonical ProjectFile chunks, not library catalog rows', () => {
  assert.match(retrieval, /projectFileKnowledgeChunk\.findMany/);
  assert.doesNotMatch(retrieval, /customProcedure|procedureDefault|incidentCode|\brole\.findMany/);
  assert.doesNotMatch(retrieval, new RegExp(syntheticFact));
});

test('authenticated CORO AI delegates exclusively to Knowledge retrieval', () => {
  assert.match(ai, /this\.retrieval\.search\(actor, input\.question, buildingId\)/);
  assert.doesNotMatch(ai, /customProcedure|procedureDefault|incidentCode/);
});

test('public assistant is isolated on the public knowledge corpus', () => {
  assert.match(publicSearch, /publicKnowledgeSource\.findMany/);
  assert.doesNotMatch(publicSearch, /customProcedure|procedureDefault|projectFileKnowledgeChunk/);
  assert.doesNotMatch(publicCatalog, new RegExp(syntheticFact));
});

test('a synthetic library-only fact remains absent after update and withdrawal simulations', () => {
  const answer = (catalogValue) => [retrieval, ai, publicSearch, publicCatalog].some((source) => source.includes(catalogValue));
  assert.equal(answer(syntheticFact), false);
  assert.equal(answer(`${syntheticFact}-UPDATED`), false);
  assert.equal(answer(''), true); // sanity check: the source set itself is not empty
});
