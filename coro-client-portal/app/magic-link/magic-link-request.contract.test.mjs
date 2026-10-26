import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('the login page exposes the governed magic-link request route', async () => {
  const login = await readFile(new URL('../login/page.tsx', import.meta.url), 'utf8');
  assert.match(login, /href="\/magic-link"/);
});

test('the request page calls the neutral throttled backend contract', async () => {
  const page = await readFile(new URL('./page.tsx', import.meta.url), 'utf8');
  assert.match(page, /\/client-auth\/magic-link\/request/);
  assert.match(page, /Si un compte actif correspond/);
  assert.doesNotMatch(page, /compte existe|compte n'existe pas/i);
});

test('token-bearing reset and magic routes disable caching and referrers', async () => {
  const config = await readFile(
    new URL('../../next.config.ts', import.meta.url),
    'utf8',
  );
  assert.match(config, /source: '\/reset-password'/);
  assert.match(config, /source: '\/magic'/);
  assert.match(config, /Referrer-Policy', value: 'no-referrer'/);
  assert.match(config, /Cache-Control', value: 'no-store'/);
});

test('magic-link validation requires MFA without a JWT fallback or email URL', async () => {
  const magic = await readFile(new URL('../magic/page.tsx', import.meta.url), 'utf8');
  const login = await readFile(new URL('../login/page.tsx', import.meta.url), 'utf8');
  assert.match(magic, /sessionStorage\.setItem\(MAGIC_MFA_EMAIL_KEY/);
  assert.match(magic, /router\.replace\('\/login'\)/);
  assert.doesNotMatch(magic, /localStorage\.setItem/);
  assert.doesNotMatch(magic, /magicMfa=/);
  assert.match(login, /sessionStorage\.getItem\(MAGIC_MFA_EMAIL_KEY\)/);
  assert.match(login, /sessionStorage\.removeItem\(MAGIC_MFA_EMAIL_KEY\)/);
});
