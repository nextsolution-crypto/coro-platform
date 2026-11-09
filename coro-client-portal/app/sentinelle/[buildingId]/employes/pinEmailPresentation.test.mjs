import assert from 'node:assert/strict';
import test from 'node:test';
import { pinEmailLabel, pinEmailResendDisabled } from './pinEmailPresentation.mjs';
test('PIN status distinguishes delivery, acceptance, simulation and ambiguity', () => {
  assert.match(pinEmailLabel('ACCEPTED'), /livraison à confirmer/);
  assert.match(pinEmailLabel('DELIVERED'), /livré selon/);
  assert.match(pinEmailLabel('SIMULATED'), /aucun courriel réel/);
  assert.match(pinEmailLabel('OUTCOME_UNKNOWN'), /Ne pas recréer/);
  assert.match(pinEmailLabel(undefined), /Livraison.*non confirmée/);
});

test('PIN resend permits legacy and simulated records but blocks missing email and ambiguous transport', () => {
  assert.equal(pinEmailResendDisabled({ email: 'qa@example.invalid', pinEmailStatus: 'NOT_VERIFIED' }), false);
  assert.equal(pinEmailResendDisabled({ email: 'qa@example.invalid', pinEmailStatus: 'SIMULATED' }), false);
  assert.equal(pinEmailResendDisabled({ email: 'qa@example.invalid', pinEmailStatus: 'OUTCOME_UNKNOWN' }), true);
  assert.ok(pinEmailResendDisabled({ email: '  ' }));
  assert.ok(pinEmailResendDisabled({}));
});
