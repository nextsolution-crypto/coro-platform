'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const {
  run,
  ACCOUNT_URL,
  WEBHOOKS_URL,
} = require('./population-brevo-nontransactional-readiness.cjs');

function response(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

test('uses GET only and emits sanitized readiness', async () => {
  const calls = [];
  const result = await run(
    { CORO_POPULATION_BREVO_READINESS_RUN: 'true', BREVO_API_KEY: 'secret' },
    async (url, options) => {
      calls.push({ url, options });
      if (url === ACCOUNT_URL) {
        return response(200, { email: 'private@example.test', plan: [{ type: 'sms', credits: 12 }] });
      }
      return response(200, {
        webhooks: [
          { type: 'transactional', channel: 'email', url: 'https://api.getcoro.io/api/webhooks/brevo/population/email', events: ['delivered'], batched: false, auth: { type: 'bearer', token: 'private' } },
          { type: 'transactional', channel: 'sms', url: 'https://api.getcoro.io/api/webhooks/brevo/population/sms', events: ['delivered'], batched: false, auth: { type: 'bearer', token: 'private' } },
        ],
      });
    },
  );
  assert.equal(result.execution, 'PASS');
  assert.equal(result.smsCreditsPositive, true);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.options.method === 'GET'));
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /private|secret|token|email@/i);
});

test('fails closed for a missing authenticated webhook', async () => {
  const result = await run(
    { CORO_POPULATION_BREVO_READINESS_RUN: 'true', BREVO_API_KEY: 'secret' },
    async (url) =>
      url === ACCOUNT_URL
        ? response(200, { plan: [] })
        : response(200, { webhooks: [] }),
  );
  assert.equal(result.execution, 'FAIL');
});

test('requires the fixed execution authority', async () => {
  await assert.rejects(() => run({ BREVO_API_KEY: 'secret' }, async () => {}), /NOT_AUTHORIZED/);
});

test('source contains no transactional endpoint or mutation method', () => {
  const source = fs.readFileSync(
    require.resolve('./population-brevo-nontransactional-readiness.cjs'),
    'utf8',
  );
  assert.doesNotMatch(source, /transactionalSMS\/send|smtp\/email/);
  assert.doesNotMatch(source, /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/);
  assert.match(
    source,
    /process\.env\.CORO_POPULATION_BREVO_READINESS_RUN === 'true'/,
  );
});
