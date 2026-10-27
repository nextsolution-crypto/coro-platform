import assert from 'node:assert/strict';
import test from 'node:test';
import { diagnosticQuestions } from '../lib/diagnostic/config.ts';
import { diagnosticModules } from '../lib/diagnostic/modules.ts';
import { diagnosticRecommendationMatrix, getDiagnosticRecommendation } from '../lib/diagnostic/recommendations.ts';
import { diagnosticAnswerIds, type DiagnosticModuleId } from '../lib/diagnostic/types.ts';
import { publicRoutes } from '../lib/site/routes.ts';

test('DX-02 contains all 40 deterministic dimension/answer variants exactly once', () => {
  assert.equal(diagnosticRecommendationMatrix.length, 40);
  const keys = diagnosticRecommendationMatrix.map((item) => `${item.dimensionId}:${item.answerId}`);
  assert.equal(new Set(keys).size, 40);
  for (const question of diagnosticQuestions) for (const answer of diagnosticAnswerIds) {
    const item = getDiagnosticRecommendation(question.id, answer);
    assert.equal(item.dimensionId, question.id); assert.equal(item.answerId, answer);
  }
});

test('every recommendation has six complete bilingual components and puts good practice before commercial modules', () => {
  for (const item of diagnosticRecommendationMatrix) {
    for (const field of ['observation', 'operationalIssue', 'goodPractice', 'action'] as const) {
      assert.ok(item[field].fr.trim(), `${item.dimensionId}:${item.answerId} ${field}.fr`);
      assert.ok(item[field].en.trim(), `${item.dimensionId}:${item.answerId} ${field}.en`);
    }
    assert.ok(item.modules.length > 0, `${item.dimensionId}:${item.answerId} modules`);
    const keys = Object.keys(item);
    assert.ok(keys.indexOf('goodPractice') < keys.indexOf('modules'));
    for (const productModule of item.modules) {
      assert.ok(productModule.availabilityLabel.fr && productModule.availabilityLabel.en && productModule.qualification.fr && productModule.qualification.en);
    }
  }
});

test('observations remain faithful to A/B/C/D/E semantics', () => {
  for (const question of diagnosticQuestions) {
    assert.match(getDiagnosticRecommendation(question.id, 'A').observation.fr, /pratique favorable/);
    assert.match(getDiagnosticRecommendation(question.id, 'B').observation.fr, /pratique partielle/);
    assert.match(getDiagnosticRecommendation(question.id, 'C').observation.fr, /capacité insuffisante/);
    assert.match(getDiagnosticRecommendation(question.id, 'D').observation.fr, /ne permet pas de confirmer/);
    assert.match(getDiagnosticRecommendation(question.id, 'E').observation.fr, /non applicable/);
    assert.doesNotMatch(getDiagnosticRecommendation(question.id, 'D').observation.fr, /défaillance|insuffisante/);
    assert.doesNotMatch(getDiagnosticRecommendation(question.id, 'B').observation.fr, /absence|inexistante/);
  }
});

test('module associations match each approved dimension profile', () => {
  const expected: Record<string, DiagnosticModuleId[]> = {
    D1: ['buildings', 'knowledge'], D2: ['documents', 'knowledge'], D3: ['sentinelle', 'exercises-rex-actions'],
    D4: ['incident', 'knowledge', 'ops'], D5: ['sentinelle', 'incident', 'ops'], D6: ['exercises-rex-actions', 'incident'],
    D7: ['incident', 'knowledge'], D8: ['exercises-rex-actions', 'audit', 'coro-index'],
  };
  for (const question of diagnosticQuestions) assert.deepEqual(getDiagnosticRecommendation(question.id, 'A').modules.map((module) => module.id), expected[question.id]);
});

test('every public destination is a real implemented route and no future route is invented', () => {
  for (const productModule of Object.values(diagnosticModules)) {
    if (!productModule.publicPath) continue;
    const route = publicRoutes.find((candidate) => candidate.path === productModule.publicPath);
    assert.ok(route?.implemented && route.path === productModule.publicPath, `${productModule.id}: ${productModule.publicPath}`);
  }
  assert.ok(!Object.values(diagnosticModules).some((module) => module.publicPath === '/coro-exercices' || module.publicPath === '/coro-ops' || module.publicPath === '/coro-network'));
});

test('future or non-public references are never labelled available', () => {
  assert.equal(diagnosticModules.ops.availability, 'planned'); assert.equal(diagnosticModules.ops.publicPath, undefined);
  assert.equal(diagnosticModules.network.availability, 'planned'); assert.equal(diagnosticModules.network.publicPath, undefined);
  assert.equal(diagnosticModules.audit.availability, 'planned'); assert.equal(diagnosticModules.audit.publicPath, undefined);
  assert.equal(diagnosticModules['exercises-rex-actions'].availability, 'available');
  assert.equal(diagnosticModules['exercises-rex-actions'].publicPath, '/resilience-operationnelle');
  assert.match(diagnosticModules['coro-index'].qualification.fr, /n’est pas l’Indice CORO officiel/);
});

test('recommendation lookup is deterministic and returns immutable configuration references', () => {
  for (const item of diagnosticRecommendationMatrix) assert.strictEqual(getDiagnosticRecommendation(item.dimensionId, item.answerId), getDiagnosticRecommendation(item.dimensionId, item.answerId));
});
