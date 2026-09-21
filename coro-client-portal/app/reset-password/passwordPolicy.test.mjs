import assert from 'node:assert/strict';
import test from 'node:test';
import { readResetPasswordFields, resetPasswordIssue, resetPasswordsMatch } from './passwordPolicy.ts';

test('synthetic passwords pass for typed and pasted values', () => {
  for (const sample of ['Abcd1234!', 'Test9Password!', 'Coro2026#Test']) {
    const typed = sample;
    const pasted = sample;
    assert.equal(resetPasswordIssue(typed), null);
    assert.equal(resetPasswordIssue(pasted), null);
    assert.equal(resetPasswordsMatch(typed, pasted), true);
    const form = new FormData();
    form.set('newPassword', pasted);
    form.set('confirmPassword', pasted);
    const values = readResetPasswordFields(form);
    assert.equal(values.password, sample);
    assert.equal(resetPasswordIssue(values.password), null);
    assert.equal(resetPasswordsMatch(values.password, values.confirmation), true);
  }
});

test('frontend keeps the same five requirements as backend', () => {
  assert.match(resetPasswordIssue('Short1!'), /8 caractères/);
  assert.match(resetPasswordIssue('lowercase1!'), /majuscule/);
  assert.match(resetPasswordIssue('UPPERCASE1!'), /minuscule/);
  assert.match(resetPasswordIssue('NoNumber!'), /chiffre \(0-9\)/);
  assert.match(resetPasswordIssue('NoSpecial1'), /spécial/);
});

test('ASCII digits only, no silent trim or normalization', () => {
  assert.equal(resetPasswordIssue('TestPassword١!'), 'Le mot de passe doit contenir au moins un chiffre (0-9).');
  assert.equal(resetPasswordIssue(' Abcd1234! '), null);
  assert.equal(resetPasswordsMatch(' Abcd1234! ', 'Abcd1234!'), false);
});
