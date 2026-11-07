'use strict';

const { createHash, randomBytes } = require('node:crypto');

const TARGET = Object.freeze({
  organizationId: '916f54ec-af22-45e0-99db-a369d9630002',
  clientId: 'd3000001-0000-4000-8000-000000000002',
  buildingId: '6a1b6f2e-38b2-5f41-a740-48252fd11224',
  actorEmail: 'demo@getcoro.io',
  organizationName: 'CORO Démo',
  clientName: 'Ateliers du Saint-Laurent Démo',
  buildingName: 'Usine Demo Nord - SP-OPS-04B',
});

const IDENTITIES = Object.freeze([
  {
    id: 'bd4a710f-5eef-5db0-82f0-4787d0b7e46f',
    email: 'demo-sp-preparer@getcoro.io',
    firstName: 'Préparateur',
    lastName: 'Sentinelle QA',
    role: 'CLIENT_MANAGER',
    permissions: ['POPULATION_PREPARE', 'POPULATION_SEND'],
    eventKey: 'sp-ops-04b-preparer-invitation-v1',
  },
  {
    id: 'dcb755b3-d1ad-5e92-bdae-0fb3daab21ba',
    email: 'demo-sp-approver@getcoro.io',
    firstName: 'Approbateur',
    lastName: 'Sentinelle QA',
    role: 'CLIENT_CORPORATE',
    permissions: ['POPULATION_APPROVE'],
    eventKey: 'sp-ops-04b-approver-invitation-v1',
  },
]);

const APPROVAL = 'SP_OPS_04B_QA_IDENTITIES_2026_11_07';
const digest = (value) => createHash('sha256').update(value.trim().toLowerCase()).digest('hex');

function resolveCompiledModule(root, basename) {
  const fs = require('node:fs');
  const path = require('node:path');
  const absoluteRoot = path.resolve(root);
  const matches = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const candidate = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) visit(candidate);
      else if (entry.isFile() && entry.name === basename) matches.push(candidate);
    }
  };
  visit(absoluteRoot);
  if (matches.length !== 1 || !matches[0].startsWith(`${absoluteRoot}${path.sep}`)) throw new Error(`QA_RUNTIME_MODULE_${matches.length ? 'AMBIGUOUS' : 'MISSING'}:${basename}`);
  return matches[0];
}

function assertAuthority(env) {
  if (env.CORO_POPULATION_QA_IDENTITIES_RUN !== 'true' || env.CORO_POPULATION_QA_IDENTITIES_APPROVAL !== APPROVAL) {
    throw new Error('EXACT_QA_IDENTITY_APPROVAL_REQUIRED');
  }
  if (env.POPULATION_CONTROLLED_LIVE_TEST_ENABLED === 'true' || env.POPULATION_CONTROLLED_LIVE_TEST_STOP !== 'true') {
    throw new Error('CONTROLLED_LIVE_SAFETY_STATE_INVALID');
  }
  const allowed = new Set((env.DEMO_AUTH_EMAIL_LIVE_RECIPIENT_SHA256_ALLOWLIST || '').split(',').map((v) => v.trim().toLowerCase()).filter(Boolean));
  if (!IDENTITIES.every((identity) => allowed.has(digest(identity.email)))) {
    throw new Error('QA_IDENTITY_INVITATION_ALLOWLIST_MISSING');
  }
}

function assertFoundation({ organization, client, building, actor }) {
  if (!organization?.isActive || organization.id !== TARGET.organizationId || organization.name !== TARGET.organizationName) throw new Error('QA_ORGANIZATION_MISMATCH');
  if (!client?.isActive || client.id !== TARGET.clientId || client.organizationId !== TARGET.organizationId || client.name !== TARGET.clientName) throw new Error('QA_CLIENT_MISMATCH');
  if (!building?.isActive || building.id !== TARGET.buildingId || building.clientId !== TARGET.clientId || building.organizationId !== TARGET.organizationId || building.name !== TARGET.buildingName) throw new Error('QA_BUILDING_MISMATCH');
  if (!actor?.isActive || actor.organizationId !== TARGET.organizationId || !['ADMIN', 'SUPER_ADMIN'].includes(actor.role)) throw new Error('QA_ACTOR_NOT_ELIGIBLE');
}

function exactExisting(existingUsers, existingInternal, existingEvents) {
  if (existingInternal.length) throw new Error('QA_IDENTITY_INTERNAL_USER_COLLISION');
  if (!existingUsers.length && !existingEvents.length) return false;
  if (existingUsers.length !== IDENTITIES.length || existingEvents.length !== IDENTITIES.length) throw new Error('QA_IDENTITY_PARTIAL_COLLISION');
  for (const expected of IDENTITIES) {
    const user = existingUsers.find((candidate) => candidate.id === expected.id && candidate.email === expected.email);
    const event = existingEvents.find((candidate) => candidate.idempotencyKey === expected.eventKey && candidate.clientUserId === expected.id);
    if (!user || !event || user.organizationId !== TARGET.organizationId || user.clientId !== TARGET.clientId || user.role !== expected.role || user.buildingIds.length !== 1 || user.buildingIds[0] !== TARGET.buildingId || JSON.stringify([...user.populationPermissions].sort()) !== JSON.stringify([...expected.permissions].sort())) throw new Error('QA_IDENTITY_EXISTING_STATE_MISMATCH');
  }
  return true;
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
    const [organization, client, building, actor, existingUsers, existingInternal, existingEvents] = await Promise.all([
      prisma.organization.findUnique({ where: { id: TARGET.organizationId } }),
      prisma.client.findUnique({ where: { id: TARGET.clientId } }),
      prisma.building.findUnique({ where: { id: TARGET.buildingId } }),
      prisma.user.findUnique({ where: { email: TARGET.actorEmail } }),
      prisma.clientUser.findMany({ where: { OR: IDENTITIES.map(({ id, email }) => ({ OR: [{ id }, { email }] })) } }),
      prisma.user.findMany({ where: { email: { in: IDENTITIES.map(({ email }) => email) } } }),
      prisma.clientInvitationEvent.findMany({ where: { idempotencyKey: { in: IDENTITIES.map(({ eventKey }) => eventKey) } } }),
    ]);
    assertFoundation({ organization, client, building, actor });
    const resumed = exactExisting(existingUsers, existingInternal, existingEvents);

    if (!resumed) {
      const outbox = new ClientInvitationOutboxService(prisma, null);
      const prepared = [];
      for (const identity of IDENTITIES) {
        const temporaryPassword = `${randomBytes(18).toString('base64url')}A1!`;
        prepared.push({
          identity,
          password: await bcrypt.hash(temporaryPassword, 10),
          envelope: outbox.protect({
            toEmail: identity.email,
            toName: `${identity.firstName} ${identity.lastName}`,
            clientName: TARGET.clientName,
            temporaryPassword,
            organizationName: TARGET.organizationName,
          }, identity.eventKey),
        });
      }
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'sp-ops-04b-qa-identities'}, 0))`;
        const collision = await tx.clientUser.count({ where: { OR: IDENTITIES.map(({ id, email }) => ({ OR: [{ id }, { email }] })) } });
        const internalCollision = await tx.user.count({ where: { email: { in: IDENTITIES.map(({ email }) => email) } } });
        if (collision || internalCollision) throw new Error('QA_IDENTITY_CONCURRENT_COLLISION');
        for (const item of prepared) {
          const user = await tx.clientUser.create({ data: {
            id: item.identity.id, email: item.identity.email, password: item.password,
            firstName: item.identity.firstName, lastName: item.identity.lastName,
            role: item.identity.role, populationPermissions: item.identity.permissions,
            buildingIds: [TARGET.buildingId], clientId: TARGET.clientId,
            organizationId: TARGET.organizationId, isActive: true,
          } });
          await tx.clientInvitationEvent.create({ data: {
            organizationId: TARGET.organizationId, clientId: TARGET.clientId,
            clientUserId: user.id, buildingId: TARGET.buildingId,
            idempotencyKey: item.identity.eventKey, ...item.envelope,
            nextAttemptAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          } });
          await tx.adminAuditEvent.create({ data: {
            actorType: 'INTERNAL_USER', actorUserId: actor.id,
            actorDisplayName: 'CORO Demo administrator', actorRole: actor.role,
            action: 'POPULATION_QA_IDENTITY_PROVISIONED', targetType: 'ClientUser',
            targetId: user.id, targetLabel: 'Sentinelle Population QA identity',
            organizationId: TARGET.organizationId, reason: 'SP-OPS-04B controlled first-live-test preparation.',
            requestId: env.GITHUB_RUN_ID || null,
            afterData: { role: item.identity.role, clientId: TARGET.clientId, buildingId: TARGET.buildingId, populationPermissions: item.identity.permissions },
          } });
        }
      });
    }

    const policy = new DemoCommunicationPolicyService(prisma);
    const email = new EmailService(policy);
    const dispatcher = new ClientInvitationOutboxService(prisma, email);
    const outcomes = [];
    for (const identity of IDENTITIES) {
      const event = await prisma.clientInvitationEvent.findUnique({ where: { idempotencyKey: identity.eventKey } });
      if (!event) throw new Error('QA_INVITATION_EVENT_MISSING');
      if (event.status === 'DELIVERED') outcomes.push('DELIVERED');
      else {
        const result = await dispatcher.dispatchOne(event.id);
        const refreshed = await prisma.clientInvitationEvent.findUnique({ where: { id: event.id } });
        outcomes.push(result.delivered && refreshed?.status === 'DELIVERED' ? 'DELIVERED' : 'FAILED');
      }
    }
    if (outcomes.some((status) => status !== 'DELIVERED')) {
      await prisma.$transaction([
        prisma.clientInvitationEvent.updateMany({ where: { idempotencyKey: { in: IDENTITIES.map(({ eventKey }) => eventKey) }, status: { in: ['PENDING', 'FAILED', 'PROCESSING'] } }, data: { status: 'CANCELLED', nextAttemptAt: null, leaseExpiresAt: null, lastErrorCode: 'CONTROLLED_QA_INVITATION_FAILED' } }),
        prisma.clientUser.updateMany({ where: { id: { in: IDENTITIES.map(({ id }) => id) } }, data: { isActive: false, sessionVersion: { increment: 1 } } }),
      ]);
      throw new Error('QA_INVITATION_DELIVERY_FAILED_ACCOUNTS_DISABLED');
    }
    const finalUsers = await prisma.clientUser.findMany({
      where: { id: { in: IDENTITIES.map(({ id }) => id) } },
    });
    exactExisting(finalUsers, [], await prisma.clientInvitationEvent.findMany({ where: { idempotencyKey: { in: IDENTITIES.map(({ eventKey }) => eventKey) } } }));
    return { schemaVersion: 1, execution: 'PASS', productionMutation: !resumed, resumed, identityCount: finalUsers.length, invitations: outcomes, roles: finalUsers.map((u) => u.role).sort(), buildingScopeCounts: finalUsers.map((u) => u.buildingIds.length), permissionCounts: finalUsers.map((u) => u.populationPermissions.length).sort(), externalMessageCount: 2, liveAlertSent: false };
  } finally {
    await prisma.$disconnect();
  }
}

if (!module.parent) execute().then((result) => process.stdout.write(`${JSON.stringify(result)}\n`)).catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
module.exports = { APPROVAL, IDENTITIES, TARGET, assertAuthority, assertFoundation, exactExisting, resolveCompiledModule, execute };
