import assert from 'node:assert/strict';
import test from 'node:test';
import { pinEmailLabel } from './pinEmailPresentation.mjs';
test('PIN status distinguishes delivery, acceptance, simulation and ambiguity', () => {
  assert.match(pinEmailLabel('ACCEPTED'), /livraison à confirmer/);
  assert.match(pinEmailLabel('DELIVERED'), /livré selon/);
  assert.match(pinEmailLabel('SIMULATED'), /aucun courriel réel/);
  assert.match(pinEmailLabel('OUTCOME_UNKNOWN'), /Ne pas recréer/);
  assert.match(pinEmailLabel(undefined), /non vérifié/);
});
