'use strict';

const crypto = require('node:crypto');

const TARGET_ORGANIZATION_ID = '916f54ec-af22-45e0-99db-a369d9630002';
const ALIASES = Object.freeze([
  { key: 'OPERATOR', email: 'demo-member@getcoro.io', kind: 'USER' },
  { key: 'CLIENT_CORPORATE', email: 'demo-clientcorp@getcoro.io', kind: 'CLIENT_USER' },
  { key: 'CLIENT_MANAGER', email: 'demo-client@getcoro.io', kind: 'CLIENT_USER' },
]);

function fingerprint(value) {
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

async function runReadOnly(prisma, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [environment, environmentCount, events, internal, clients] = await Promise.all([
      tx.demoEnvironment.findUnique({
        where: { organizationId: TARGET_ORGANIZATION_ID },
        select: { status: true, communicationMode: true, externalProvidersDisabled: true, lockVersion: true, updatedAt: true },
      }),
      tx.demoEnvironment.count(),
      tx.demoCommunicationEvent.findMany({
        where: { organizationId: TARGET_ORGANIZATION_ID, createdAt: { gte: since } },
        select: { operation: true, channel: true, recipientHash: true, simulated: true, blocked: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      tx.user.findUnique({
        where: { email: ALIASES[0].email },
        select: { id: true, organizationId: true, isActive: true, resetToken: true, resetTokenExpiry: true, mfaCodeExpiry: true },
      }),
      Promise.all(ALIASES.slice(1).map((alias) => tx.clientUser.findUnique({
        where: { email: alias.email },
        select: {
          id: true, organizationId: true, isActive: true, mfaCodeExpiry: true,
          client: { select: { isActive: true } },
          passwordResetTokens: {
            where: { createdAt: { gte: since } },
            select: { usedAt: true, expiresAt: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      }))),
    ]);

    const eventSummary = ALIASES.map((alias) => {
      const recipientHash = fingerprint(alias.email);
      const matching = events.filter((event) => event.recipientHash === recipientHash);
      return {
        alias: alias.key,
        eventCount24h: matching.length,
        events: matching.map((event) => ({
          operation: event.operation,
          channel: event.channel,
          simulated: event.simulated,
          blocked: event.blocked,
          createdAt: event.createdAt,
        })),
      };
    });

    const internalState = internal ? {
      alias: 'OPERATOR',
      identityFingerprint: fingerprint(internal.id),
      targetOrganization: internal.organizationId === TARGET_ORGANIZATION_ID,
      eligible: internal.isActive === true,
      resetLinkPresent: Boolean(internal.resetToken),
      resetLinkUnexpired: Boolean(internal.resetTokenExpiry && internal.resetTokenExpiry > now),
      mfaChallengeUnexpired: Boolean(internal.mfaCodeExpiry && internal.mfaCodeExpiry > now),
    } : { alias: 'OPERATOR', missing: true };

    const clientStates = clients.map((client, index) => {
      const alias = ALIASES[index + 1];
      if (!client) return { alias: alias.key, missing: true };
      const recent = client.passwordResetTokens ?? [];
      return {
        alias: alias.key,
        identityFingerprint: fingerprint(client.id),
        targetOrganization: client.organizationId === TARGET_ORGANIZATION_ID,
        eligible: client.isActive === true && client.client.isActive === true,
        resetRequests24h: recent.length,
        activeResetLinks: recent.filter((token) => token.usedAt === null && token.expiresAt > now).length,
        invalidatedResetLinks: recent.filter((token) => token.usedAt !== null).length,
        mfaChallengeUnexpired: Boolean(client.mfaCodeExpiry && client.mfaCodeExpiry > now),
      };
    });

    return {
      schemaVersion: 1,
      execution: 'PASS',
      readOnly: true,
      observedAt: now.toISOString(),
      environment: environment ? {
        status: environment.status,
        communicationMode: environment.communicationMode,
        externalProvidersDisabled: environment.externalProvidersDisabled,
        lockVersion: environment.lockVersion,
        updatedAt: environment.updatedAt,
      } : null,
      configuredDemoEnvironmentCount: environmentCount,
      scopeConclusion: environmentCount === 1 ? 'TARGET_DEMO_ONLY' : 'MULTIPLE_DEMO_ENVIRONMENTS_REVIEW_REQUIRED',
      eventSummary,
      authenticationState: [internalState, ...clientStates],
      providerInvocationExpected:
        environment?.status === 'ACTIVE' && environment.communicationMode === 'LIVE' && environment.externalProvidersDisabled === false,
    };
  }, { timeout: 60_000 });
}

async function main() {
  if (process.env.CORO_DEMO_AUTH_EMAIL_DIAGNOSIS_RUN !== 'true') throw new Error('EXPLICIT_RUNTIME_SWITCH_REQUIRED');
  const { PrismaClient } = require('/app/node_modules/@prisma/client');
  const prisma = new PrismaClient();
  try { process.stdout.write(`${JSON.stringify(await runReadOnly(prisma))}\n`); }
  finally { await prisma.$disconnect(); }
}

module.exports = { ALIASES, TARGET_ORGANIZATION_ID, fingerprint, runReadOnly };

if (require.main === module || process.env.CORO_DEMO_AUTH_EMAIL_DIAGNOSIS_RUN === 'true') {
  main().catch(() => {
    process.stdout.write('{"schemaVersion":1,"execution":"FAILED","readOnly":true}\n');
    process.exitCode = 1;
  });
}
