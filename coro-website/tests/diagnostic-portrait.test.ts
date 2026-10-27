import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { buildResiliencePortraitGeometry, PORTRAIT_MINIMUM_RADAR_DIMENSIONS } from '../lib/diagnostic/portrait.ts';
import type { CompleteDiagnosticResponses, DiagnosticAnswerId } from '../lib/diagnostic/types.ts';

const responses = (answers: readonly DiagnosticAnswerId[]): CompleteDiagnosticResponses => Object.fromEntries(answers.map((answer, index) => [`D${index + 1}`, answer])) as CompleteDiagnosticResponses;
const repeated = (answer: DiagnosticAnswerId) => responses(Array.from({ length: 8 }, () => answer));

test('DX-03B maps A, B and C to 3, 2 and 0 without recalculating the global score', () => {
  assert.deepEqual(buildResiliencePortraitGeometry(repeated('A')).numericPoints.map(({ value }) => value), Array(8).fill(3));
  assert.deepEqual(buildResiliencePortraitGeometry(repeated('B')).numericPoints.map(({ value }) => value), Array(8).fill(2));
  assert.deepEqual(buildResiliencePortraitGeometry(repeated('C')).numericPoints.map(({ value }) => value), Array(8).fill(0));
});

test('DX-03B never turns unknown or not-applicable answers into zero', () => {
  const geometry = buildResiliencePortraitGeometry(responses(['A', 'D', 'C', 'E', 'B', 'D', 'A', 'E']));
  assert.equal(geometry.closedPolygon, null);
  assert.deepEqual(geometry.points.filter(({ answerId }) => answerId === 'D' || answerId === 'E').map(({ value }) => value), [null, null, null, null]);
  assert.deepEqual(geometry.numericPoints.map(({ value }) => value), [3, 0, 2, 3]);
  assert.ok(geometry.openSegments.every((segment) => !segment.includes('null')));
});

test('DX-03B closes a surface only for eight evaluable dimensions', () => {
  assert.ok(buildResiliencePortraitGeometry(repeated('A')).closedPolygon);
  assert.equal(buildResiliencePortraitGeometry(responses(['A', 'A', 'A', 'A', 'A', 'A', 'A', 'D'])).closedPolygon, null);
});

test('DX-03B uses the structured alternative below three evaluable dimensions', () => {
  assert.equal(PORTRAIT_MINIMUM_RADAR_DIMENSIONS, 3);
  assert.equal(buildResiliencePortraitGeometry(responses(['A', 'B', 'D', 'D', 'E', 'E', 'D', 'E'])).usesAlternative, true);
  assert.equal(buildResiliencePortraitGeometry(responses(['A', 'B', 'C', 'D', 'E', 'E', 'D', 'E'])).usesAlternative, false);
  assert.equal(buildResiliencePortraitGeometry(repeated('D')).usesAlternative, true);
  assert.equal(buildResiliencePortraitGeometry(repeated('E')).usesAlternative, true);
});

test('DX-03B geometry is deterministic and does not mutate responses', () => {
  const input = responses(['A', 'B', 'C', 'D', 'E', 'A', 'B', 'C']);
  const snapshot = structuredClone(input);
  assert.deepEqual(buildResiliencePortraitGeometry(input), buildResiliencePortraitGeometry(input));
  assert.deepEqual(input, snapshot);
});

test('DX-03B component is bilingual, accessible and SVG-native with a structured alternative', () => {
  const source = readFileSync(resolve('app/diagnostic/ResiliencePortrait.tsx'), 'utf8');
  assert.match(source, /Portrait de résilience CORO/);
  assert.match(source, /CORO Resilience Portrait/);
  assert.match(source, /role="img"/);
  assert.match(source, /aria-labelledby/);
  assert.match(source, /<table>/);
  assert.match(source, /geometry\.usesAlternative/);
  assert.doesNotMatch(source, /canvas|chart\.js|recharts|fetch\(|localStorage|sessionStorage/);
});

test('DX-03B result order places the portrait before strengths and recommendations', () => {
  const source = readFileSync(resolve('app/diagnostic/DiagnosticExperience.tsx'), 'utf8');
  const portrait = source.indexOf('<ResiliencePortrait');
  const strengths = source.indexOf('id="strengths-title"');
  const priorities = source.indexOf('id="priorities-title"');
  const verification = source.indexOf('id="verification-title"');
  const recommendations = source.indexOf('id="recommendations-title"');
  const plan = source.indexOf('id="plan-title"');
  assert.ok(portrait > 0 && portrait < strengths && strengths < priorities && priorities < verification && verification < recommendations && recommendations < plan);
});
