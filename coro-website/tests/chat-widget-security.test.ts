import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../app/components/ChatWidget.tsx', import.meta.url), 'utf8');

test('contact request requires consent and sends a bounded summary, not full history', () => {
  assert.match(source, /contactConsent/);
  assert.match(source, /summary,/);
  assert.match(source, /\.slice\(0, 1500\)/);
  assert.match(source, /consent: true/);
  assert.match(source, /requestId:/);
  assert.doesNotMatch(source, /JSON\.stringify\(\{ email: visitorEmail, history \}\)/);
});

test('provider failures cannot become visible success', () => {
  assert.match(source, /!response\.ok \|\| result\.success !== true/);
  assert.match(source, /setContactError/);
  assert.doesNotMatch(source, /catch \{\s*setEmailSent\(true\)/);
});

test('concurrent contact submissions are disabled', () => {
  assert.match(source, /contactSending/);
  assert.match(source, /disabled=\{!visitorEmail\.trim\(\) \|\| !contactConsent \|\| contactSending\}/);
});

test('chat input and outbound history respect backend limits', () => {
  assert.match(source, /maxLength=\{2000\}/);
  assert.match(source, /messages\.slice\(-10\)/);
  assert.match(source, /content\.slice\(0, 2000\)/);
});
