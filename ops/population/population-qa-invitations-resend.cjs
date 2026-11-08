'use strict';

const { createHash, randomBytes } = require('node:crypto');
const TARGET = Object.freeze({ organizationId: '916f54ec-af22-45e0-99db-a369d9630002', clientId: 'd3000001-0000-4000-8000-000000000002', buildingId: '6a1b6f2e-38b2-5f41-a740-48252fd11224', actorEmail: 'demo@getcoro.io', organizationName: 'CORO Démo', clientName: 'Ateliers du Saint-Laurent Démo', buildingName: 'Usine Demo Nord - SP-OPS-04B' });
const BASE_IDENTITIES = Object.freeze([
  { id: 'bd4a710f-5eef-5db0-82f0-4787d0b7e46f', email: 'demo-sp-preparer@getcoro.io', firstName: 'Préparateur', lastName: 'Sentinelle QA', role: 'CLIENT_MANAGER', permissions: ['POPULATION_PREPARE', 'POPULATION_SEND'], eventKey: 'sp-ops-04b-preparer-invitation-v1' },
  { id: 'dcb755b3-d1ad-5e92-bdae-0fb3daab21ba', email: 'demo-sp-approver@getcoro.io', firstName: 'Approbateur', lastName: 'Sentinelle QA', role: 'CLIENT_CORPORATE', permissions: ['POPULATION_APPROVE'], eventKey: 'sp-ops-04b-approver-invitation-v1' },
]);

const APPROVAL = 'SP_OPS_04B_QA_INVITATIONS_RESEND_ONCE_2026_11_08';
const IDENTITIES = Object.freeze(BASE_IDENTITIES.map((identity) => Object.freeze({
  ...identity,
  previousEventKey: identity.eventKey,
  eventKey: identity.eventKey.replace(/-v1$/, '-v2'),
})));
const digest = (value) => createHash('sha256').update(value.trim().toLowerCase()).digest('hex');

function resolveCompiledModule(root, basename) {
  const fs = require('node:fs'); const path = require('node:path'); const absoluteRoot = path.resolve(root); const matches = [];
  const visit = (directory) => { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { const candidate = path.join(directory, entry.name); if (entry.isSymbolicLink()) continue; if (entry.isDirectory()) visit(candidate); else if (entry.isFile() && entry.name === basename) matches.push(candidate); } };
  visit(absoluteRoot);
  if (matches.length !== 1 || !matches[0].startsWith(`${absoluteRoot}${path.sep}`)) throw new Error(`QA_RUNTIME_MODULE_${matches.length ? 'AMBIGUOUS' : 'MISSING'}:${basename}`);
  return matches[0];
}

function assertFoundation({ organization, client, building, actor }) {
  if (!organization?.isActive || organization.id !== TARGET.organizationId || organization.name !== TARGET.organizationName) throw new Error('QA_ORGANIZATION_MISMATCH');
  if (!client?.isActive || client.id !== TARGET.clientId || client.organizationId !== TARGET.organizationId || client.name !== TARGET.clientName) throw new Error('QA_CLIENT_MISMATCH');
  if (!building?.isActive || building.id !== TARGET.buildingId || building.clientId !== TARGET.clientId || building.organizationId !== TARGET.organizationId || building.name !== TARGET.buildingName) throw new Error('QA_BUILDING_MISMATCH');
  if (!actor?.isActive || actor.organizationId !== TARGET.organizationId || !['ADMIN', 'SUPER_ADMIN'].includes(actor.role)) throw new Error('QA_ACTOR_NOT_ELIGIBLE');
}

function assertAuthority(env) {
  if (env.CORO_POPULATION_QA_INVITATIONS_RESEND !== 'true' || env.CORO_POPULATION_QA_INVITATIONS_RESEND_APPROVAL !== APPROVAL) throw new Error('EXACT_QA_RESEND_APPROVAL_REQUIRED');
  if (env.POPULATION_CONTROLLED_LIVE_TEST_ENABLED === 'true' || env.POPULATION_CONTROLLED_LIVE_TEST_STOP !== 'true') throw new Error('CONTROLLED_LIVE_SAFETY_STATE_INVALID');
  const allowed = new Set((env.DEMO_AUTH_EMAIL_LIVE_RECIPIENT_SHA256_ALLOWLIST || '').split(',').map((v) => v.trim().toLowerCase()).filter(Boolean));
  if (!IDENTITIES.every(({ email }) => allowed.has(digest(email)))) throw new Error('QA_RESEND_ALLOWLIST_MISSING');
}

function assertExactState(users, previousEvents, resendEvents) {
  if (users.length !== 2 || previousEvents.length !== 2) throw new Error('QA_RESEND_BASE_STATE_INCOMPLETE');
  for (const expected of IDENTITIES) {
    const user = users.find((candidate) => candidate.id === expected.id && candidate.email === expected.email);
    const previous = previousEvents.find((candidate) => candidate.idempotencyKey === expected.previousEventKey && candidate.clientUserId === expected.id);
    if (!user || !user.isActive || user.organizationId !== TARGET.organizationId || user.clientId !== TARGET.clientId || user.role !== expected.role || user.buildingIds.length !== 1 || user.buildingIds[0] !== TARGET.buildingId || JSON.stringify([...user.populationPermissions].sort()) !== JSON.stringify([...expected.permissions].sort())) throw new Error('QA_RESEND_IDENTITY_STATE_MISMATCH');
    if (!previous || previous.status !== 'DELIVERED') throw new Error('QA_RESEND_PREVIOUS_INVITATION_NOT_RECONCILED');
    const resend = resendEvents.find((candidate) => candidate.idempotencyKey === expected.eventKey);
    if (resend && (resend.clientUserId !== expected.id || resend.organizationId !== TARGET.organizationId || resend.clientId !== TARGET.clientId || resend.buildingId !== TARGET.buildingId)) throw new Error('QA_RESEND_EVENT_COLLISION');
  }
}

async function execute(env = process.env) {
  assertAuthority(env);
  const bcrypt = require('bcrypt');
  const { PrismaClient } = require('@prisma/client');
  const runtimeRoot = '/app/dist';
  const { ClientInvitationOutboxService } = require(resolveCompiledModule(runtimeRoot, 'client-invitation-outbox.service.js'));
  const { DemoCommunicationPolicyService } = require(resolveCompiledModule(runtimeRoot, 'demo-communication-policy.service.js'));
  const { EmailService } = require(resolveCompiledModule(runtimeRoot, 'email.service.js'));
  const prisma = new PrismaClient();
  try {
    const [organization, client, building, actor, users, previousEvents, resendEvents] = await Promise.all([
      prisma.organization.findUnique({ where: { id: TARGET.organizationId } }),
      prisma.client.findUnique({ where: { id: TARGET.clientId } }),
      prisma.building.findUnique({ where: { id: TARGET.buildingId } }),
      prisma.user.findUnique({ where: { email: TARGET.actorEmail } }),
      prisma.clientUser.findMany({ where: { id: { in: IDENTITIES.map(({ id }) => id) } } }),
      prisma.clientInvitationEvent.findMany({ where: { idempotencyKey: { in: IDENTITIES.map(({ previousEventKey }) => previousEventKey) } } }),
      prisma.clientInvitationEvent.findMany({ where: { idempotencyKey: { in: IDENTITIES.map(({ eventKey }) => eventKey) } } }),
    ]);
    assertFoundation({ organization, client, building, actor });
    assertExactState(users, previousEvents, resendEvents);
    if (resendEvents.length) throw new Error('QA_RESEND_ALREADY_EXECUTED_RECONCILE_ONLY');

    const protector = new ClientInvitationOutboxService(prisma, null);
    const prepared = [];
    for (const identity of IDENTITIES) {
      const temporaryPassword = `${randomBytes(18).toString('base64url')}A1!`;
      prepared.push({
        identity,
        password: await bcrypt.hash(temporaryPassword, 10),
        envelope: protector.protect({ toEmail: identity.email, toName: `${identity.firstName} ${identity.lastName}`, clientName: TARGET.clientName, temporaryPassword, organizationName: TARGET.organizationName }, identity.eventKey),
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'sp-ops-04b-qa-invitations-resend-v2'}, 0))`;
      if (await tx.clientInvitationEvent.count({ where: { idempotencyKey: { in: IDENTITIES.map(({ eventKey }) => eventKey) } } })) throw new Error('QA_RESEND_CONCURRENT_EVENT_COLLISION');
      for (const item of prepared) {
        const updated = await tx.clientUser.updateMany({ where: { id: item.identity.id, email: item.identity.email, organizationId: TARGET.organizationId, clientId: TARGET.clientId, isActive: true }, data: { password: item.password, sessionVersion: { increment: 1 }, mfaCode: null, mfaCodeExpiry: null } });
        if (updated.count !== 1) throw new Error('QA_RESEND_IDENTITY_CONCURRENT_CHANGE');
        await tx.clientTrustedDevice.deleteMany({ where: { userId: item.identity.id } });
        await tx.magicLink.updateMany({ where: { userId: item.identity.id, usedAt: null }, data: { usedAt: new Date() } });
        await tx.clientPasswordResetToken.updateMany({ where: { clientUserId: item.identity.id, usedAt: null }, data: { usedAt: new Date() } });
        await tx.clientInvitationEvent.create({ data: { organizationId: TARGET.organizationId, clientId: TARGET.clientId, clientUserId: item.identity.id, buildingId: TARGET.buildingId, idempotencyKey: item.identity.eventKey, ...item.envelope, nextAttemptAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
        await tx.adminAuditEvent.create({ data: { actorType: 'INTERNAL_USER', actorUserId: actor.id, actorDisplayName: 'CORO Demo administrator', actorRole: actor.role, action: 'POPULATION_QA_INVITATION_RESENT_ONCE', targetType: 'ClientUser', targetId: item.identity.id, targetLabel: 'Sentinelle Population QA identity', organizationId: TARGET.organizationId, reason: 'Aliases verified; one governed invitation resend authorized.', requestId: env.GITHUB_RUN_ID || null, afterData: { clientId: TARGET.clientId, buildingId: TARGET.buildingId, sessionsRevoked: true, priorLinksInvalidated: true, invitationVersion: 2 } } });
      }
    });

    const dispatcher = new ClientInvitationOutboxService(prisma, new EmailService(new DemoCommunicationPolicyService(prisma)));
    const outcomes = [];
    for (const identity of IDENTITIES) {
      const event = await prisma.clientInvitationEvent.findUnique({ where: { idempotencyKey: identity.eventKey } });
      const result = event && await dispatcher.dispatchOne(event.id);
      const refreshed = event && await prisma.clientInvitationEvent.findUnique({ where: { id: event.id } });
      outcomes.push(result?.delivered && refreshed?.status === 'DELIVERED' ? 'DELIVERED' : 'FAILED');
    }
    if (outcomes.some((status) => status !== 'DELIVERED')) {
      await prisma.$transaction([
        prisma.clientInvitationEvent.updateMany({ where: { idempotencyKey: { in: IDENTITIES.map(({ eventKey }) => eventKey) }, status: { in: ['PENDING', 'FAILED', 'PROCESSING'] } }, data: { status: 'CANCELLED', nextAttemptAt: null, leaseExpiresAt: null, lastErrorCode: 'CONTROLLED_QA_RESEND_FAILED_NO_RETRY' } }),
        prisma.clientUser.updateMany({ where: { id: { in: IDENTITIES.map(({ id }) => id) } }, data: { isActive: false, sessionVersion: { increment: 1 }, mfaCode: null, mfaCodeExpiry: null } }),
        prisma.clientTrustedDevice.deleteMany({ where: { userId: { in: IDENTITIES.map(({ id }) => id) } } }),
      ]);
      throw new Error('QA_RESEND_FAILED_ACCOUNTS_DISABLED_NO_RETRY');
    }
    return { schemaVersion: 1, execution: 'PASS', invitationVersion: 2, identityCount: 2, previousInvitationsReconciled: 2, invitations: outcomes, externalMessageCount: 2, sessionsRevoked: true, priorLinksInvalidated: true, liveAlertSent: false };
  } finally { await prisma.$disconnect(); }
}

if (!module.parent) execute().then((result) => process.stdout.write(`${JSON.stringify(result)}\n`)).catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
module.exports = { APPROVAL, IDENTITIES, assertAuthority, assertExactState, execute };
