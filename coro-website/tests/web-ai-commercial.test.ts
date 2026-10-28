import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const form = readFileSync(new URL('../app/components/WebAICommercialQualification.tsx', import.meta.url), 'utf8');
const widget = readFileSync(new URL('../app/components/ChatWidget.tsx', import.meta.url), 'utf8');

test('commercial qualification is explicit, bilingual and idempotent', () => {
  assert.match(form, /crypto\.randomUUID\(\)/);
  assert.match(form, /consentToProcess/);
  assert.match(form, /marketingConsent/);
  assert.match(form, /facultative/);
  assert.match(form, /optional/);
  assert.match(form, /chat\/v1\/commercial-requests/);
});

test('no conversation, score, hidden profile or real provider configuration is submitted', () => {
  assert.doesNotMatch(form, /messages|history|conversation|BREVO|booking/i);
  assert.doesNotMatch(form, /localStorage|sessionStorage/);
  assert.match(widget, /result\.commercialPrompt/);
});

test('success is displayed only after a successful backend response', () => {
  assert.match(form, /!response\.ok \|\| result\.success !== true/);
  assert.match(form, /setStatus\("success"\)/);
  assert.match(form, /Aucun succès n’a été enregistré/);
});
