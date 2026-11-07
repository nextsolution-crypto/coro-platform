'use strict';

const ACCOUNT_URL = 'https://api.brevo.com/v3/account';
const WEBHOOKS_URL =
  'https://api.brevo.com/v3/webhooks?type=transactional&sort=desc';
const EXPECTED_HOST = 'api.getcoro.io';
const EXPECTED_PATHS = Object.freeze([
  '/api/webhooks/brevo/population/email',
  '/api/webhooks/brevo/population/sms',
]);

function summarizeWebhook(webhook) {
  let parsed;
  try {
    parsed = new URL(webhook?.url ?? '');
  } catch {
    return null;
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.hostname !== EXPECTED_HOST ||
    !EXPECTED_PATHS.includes(parsed.pathname)
  ) {
    return null;
  }
  return {
    path: parsed.pathname,
    type: webhook.type ?? null,
    channel: webhook.channel ?? null,
    events: Array.isArray(webhook.events)
      ? [...new Set(webhook.events.map(String))].sort()
      : [],
    batched: webhook.batched === true,
    authType: webhook.auth?.type ?? null,
  };
}

async function fetchJson(fetchImpl, url, apiKey) {
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { accept: 'application/json', 'api-key': apiKey },
    redirect: 'error',
  });
  let body = null;
  if (response.ok) body = await response.json();
  return { status: response.status, body };
}

async function run(environment = process.env, fetchImpl = globalThis.fetch) {
  if (environment.CORO_POPULATION_BREVO_READINESS_RUN !== 'true') {
    throw new Error('POPULATION_BREVO_READINESS_NOT_AUTHORIZED');
  }
  const apiKey = environment.BREVO_API_KEY?.trim();
  if (!apiKey) throw new Error('BREVO_API_KEY_UNSET');
  if (typeof fetchImpl !== 'function') throw new Error('FETCH_UNAVAILABLE');

  const account = await fetchJson(fetchImpl, ACCOUNT_URL, apiKey);
  const webhooks = await fetchJson(fetchImpl, WEBHOOKS_URL, apiKey);
  const plans = Array.isArray(account.body?.plan) ? account.body.plan : [];
  const smsPlan = plans.find((entry) => entry?.type === 'sms');
  const matched = Array.isArray(webhooks.body?.webhooks)
    ? webhooks.body.webhooks.map(summarizeWebhook).filter(Boolean)
    : [];
  const paths = Object.fromEntries(
    EXPECTED_PATHS.map((path) => [
      path,
      matched.some(
        (webhook) =>
          webhook.path === path &&
          webhook.type === 'transactional' &&
          webhook.authType === 'bearer' &&
          webhook.batched === false,
      ),
    ]),
  );

  return {
    schemaVersion: 1,
    execution:
      account.status === 200 &&
      webhooks.status === 200 &&
      Object.values(paths).every(Boolean)
        ? 'PASS'
        : 'FAIL',
    nonTransactional: true,
    accountHttp: account.status,
    webhooksHttp: webhooks.status,
    smsCreditsKnown: Number.isFinite(Number(smsPlan?.credits)),
    smsCreditsPositive: Number(smsPlan?.credits) > 0,
    webhookPaths: paths,
    webhooks: matched,
  };
}

if (
  require.main === module ||
  process.env.CORO_POPULATION_BREVO_READINESS_RUN === 'true'
) {
  run()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result)}\n`);
    })
    .catch((error) => {
      process.stderr.write(
        `${JSON.stringify({ execution: 'FAIL', error: error.message })}\n`,
      );
      process.exitCode = 1;
    });
}

module.exports = { run, summarizeWebhook, ACCOUNT_URL, WEBHOOKS_URL };
