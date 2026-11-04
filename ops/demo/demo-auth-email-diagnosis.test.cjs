'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { ALIASES, TARGET_ORGANIZATION_ID, fingerprint, runReadOnly } = require('./demo-auth-email-diagnosis.cjs');

const now = new Date('2026-11-04T18:00:00.000Z');

function harness() {
  let statement;
  const hashes = Object.fromEntries(ALIASES.map((alias) => [alias.key, fingerprint(alias.email)]));
  const clients = Object.fromEntries(ALIASES.slice(1).map((alias, index) => [alias.email, {
    id: `client-${index}`, organizationId: TARGET_ORGANIZATION_ID, isActive: true,
    mfaCodeExpiry: new Date(now.getTime() + 60_000), client: { isActive: true },
    passwordResetTokens: [{ createdAt: now, expiresAt: new Date(now.getTime() + 60_000), usedAt: null }],
  }]));
  const tx = {
    $executeRawUnsafe: async (value) => { statement = value; },
    demoEnvironment: {
      findUnique: async () => ({ status: 'ACTIVE', communicationMode: 'SIMULATE', externalProvidersDisabled: true, lockVersion: 2, updatedAt: now }),
      count: async () => 1,
    },
    demoCommunicationEvent: { findMany: async () => [
      { operation: 'PLATFORM_MFA', channel: 'EMAIL', recipientHash: hashes.OPERATOR, simulated: true, blocked: false, createdAt: now },
      { operation: 'CLIENT_PORTAL_EMAIL', channel: 'EMAIL', recipientHash: hashes.CLIENT_MANAGER, simulated: true, blocked: false, createdAt: now },
    ] },
    user: { findUnique: async () => ({ id: 'user-1', organizationId: TARGET_ORGANIZATION_ID, isActive: true, resetToken: 'hashed', resetTokenExpiry: new Date(now.getTime() + 60_000), mfaCodeExpiry: null }) },
    clientUser: { findUnique: async ({ where }) => clients[where.email] ?? null },
  };
  return { prisma: { $transaction: async (fn) => fn(tx) }, statement: () => statement };
}

test('diagnoses simulated authentication mail without exposing payloads', async () => {
  const h = harness();
  const result = await runReadOnly(h.prisma, now);
  assert.equal(h.statement(), 'SET TRANSACTION READ ONLY');
  assert.equal(result.environment.communicationMode, 'SIMULATE');
  assert.equal(result.providerInvocationExpected, false);
  assert.equal(result.eventSummary.find((entry) => entry.alias === 'OPERATOR').events[0].simulated, true);
  assert.equal(result.authenticationState.find((entry) => entry.alias === 'CLIENT_MANAGER').activeResetLinks, 1);
});

test('does not emit raw aliases, codes, tokens or event payloads', async () => {
  const serialized = JSON.stringify(await runReadOnly(harness().prisma, now));
  for (const alias of ALIASES) assert.equal(serialized.includes(alias.email), false);
  assert.equal(serialized.includes('hashed'), false);
  assert.equal(serialized.includes('mfaCode'), false);
});

test('requires the explicit runtime switch and a read-only transaction', () => {
  const source = fs.readFileSync(require.resolve('./demo-auth-email-diagnosis.cjs'), 'utf8');
  assert.match(source, /CORO_DEMO_AUTH_EMAIL_DIAGNOSIS_RUN/);
  assert.match(source, /SET TRANSACTION READ ONLY/);
});
