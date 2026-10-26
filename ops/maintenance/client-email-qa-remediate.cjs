'use strict';

const ACCIDENTAL_CLIENT_ID = '3a4fa159-7957-4240-b9c0-1194d034c654';
const RECIPIENT = 'info@getcoro.io';
const ACCIDENTAL_CLIENT_NAME = 'CORO QA V1 EMAIL 2026-10-26';
const ACCIDENTAL_FIRST_NAME = 'Recette';
const ACCIDENTAL_LAST_NAME = 'CORO V1';
const QA_ORGANIZATION_ID = '00000000-0000-4000-8000-00000000e101';
const QA_CLIENT_ID = '00000000-0000-4000-8000-00000000e102';
const QA_BUILDING_ID = '00000000-0000-4000-8000-00000000e103';
const QA_ORGANIZATION_NAME = 'CORO QA Production Email Acceptance';
const QA_CLIENT_NAME = 'Client QA — courriels transactionnels';
const QA_BUILDING_NAME = 'Bâtiment QA — courriels transactionnels';
const APPROVAL = 'REMEDIATE_CLIENT_EMAIL_QA_2026_10_26';

function assertApproval(env) {
  if (env.CLIENT_EMAIL_QA_REMEDIATION_RUN !== 'true' || env.CLIENT_EMAIL_QA_REMEDIATION_APPROVAL !== APPROVAL) {
    throw new Error('Explicit remediation approval is required.');
  }
}

function assertAccidentalFixture(client, clientUser, now = new Date()) {
  if (!client || client.id !== ACCIDENTAL_CLIENT_ID || client.name !== ACCIDENTAL_CLIENT_NAME ||
      client.contactEmail?.toLowerCase() !== RECIPIENT || client.contactFirstName !== ACCIDENTAL_FIRST_NAME ||
      client.contactLastName !== ACCIDENTAL_LAST_NAME || client.buildings.length !== 0 || client.projects.length !== 0) {
    throw new Error('Accidental client fixture identity or emptiness check failed.');
  }
  if (!clientUser || clientUser.email.toLowerCase() !== RECIPIENT || clientUser.clientId !== client.id ||
      clientUser.organizationId !== client.organizationId || clientUser.firstName !== ACCIDENTAL_FIRST_NAME ||
      clientUser.lastName !== ACCIDENTAL_LAST_NAME || clientUser.role !== 'CLIENT_CORPORATE' || !clientUser.isActive ||
      clientUser.buildingIds.length !== 0) {
    throw new Error('Accidental ClientUser identity check failed.');
  }
  const createdAt = new Date(clientUser.createdAt);
  if (createdAt < new Date('2026-10-26T00:00:00.000Z') || createdAt > now) {
    throw new Error('Accidental ClientUser creation window check failed.');
  }
}

function assertQaCollision(entity, expectedName, type) {
  if (entity && entity.name !== expectedName) throw new Error(`${type} reserved ID collision.`);
}

async function requestMe(token) {
  const origin = process.env.CLIENT_EMAIL_QA_BACKEND_ORIGIN || 'http://127.0.0.1:3002';
  const response = await fetch(`${origin}/api/client-auth/me`, {
    headers: { authorization: `Bearer ${token}` },
  });
  return response.status;
}

async function run(env = process.env) {
  assertApproval(env);
  if (!env.JWT_SECRET) throw new Error('JWT_SECRET is required in the backend runtime.');
  const { PrismaClient } = require('@prisma/client');
  const { JwtService } = require('@nestjs/jwt');
  const jwt = new JwtService({ secret: env.JWT_SECRET });
  const prisma = new PrismaClient();
  await prisma.$connect();
  try {
    const [client, clientUser, internalUsers, qaOrganization, qaClient, qaBuilding] = await Promise.all([
      prisma.client.findUnique({
        where: { id: ACCIDENTAL_CLIENT_ID },
        include: { buildings: { select: { id: true } }, projects: { select: { id: true } } },
      }),
      prisma.clientUser.findUnique({ where: { email: RECIPIENT } }),
      prisma.user.findMany({ where: { email: { equals: RECIPIENT, mode: 'insensitive' } }, select: { id: true, updatedAt: true } }),
      prisma.organization.findUnique({ where: { id: QA_ORGANIZATION_ID }, select: { id: true, name: true } }),
      prisma.client.findUnique({ where: { id: QA_CLIENT_ID }, select: { id: true, name: true, organizationId: true } }),
      prisma.building.findUnique({ where: { id: QA_BUILDING_ID }, select: { id: true, name: true, organizationId: true, clientId: true } }),
    ]);
    assertAccidentalFixture(client, clientUser);
    assertQaCollision(qaOrganization, QA_ORGANIZATION_NAME, 'QA organization');
    assertQaCollision(qaClient, QA_CLIENT_NAME, 'QA client');
    assertQaCollision(qaBuilding, QA_BUILDING_NAME, 'QA building');
    if (qaClient && qaClient.organizationId !== QA_ORGANIZATION_ID) throw new Error('QA client scope collision.');
    if (qaBuilding && (qaBuilding.organizationId !== QA_ORGANIZATION_ID || qaBuilding.clientId !== QA_CLIENT_ID)) {
      throw new Error('QA building scope collision.');
    }

    const oldToken = jwt.sign({
      sub: clientUser.id,
      email: clientUser.email,
      role: clientUser.role,
      clientId: clientUser.clientId,
      organizationId: clientUser.organizationId,
      buildingIds: clientUser.buildingIds,
      populationPermissions: clientUser.populationPermissions,
      operationalReviewPermissions: clientUser.operationalReviewPermissions,
      correctiveActionPermissions: clientUser.correctiveActionPermissions,
      sessionVersion: clientUser.sessionVersion,
    }, env.JWT_SECRET, { expiresIn: '5m' });
    const beforeStatus = await requestMe(oldToken);
    if (beforeStatus !== 200) throw new Error(`Pre-remediation session proof failed with HTTP ${beforeStatus}.`);

    const retiredEmail = `retired-${clientUser.id}@qa.invalid`;
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ClientUser" WHERE id = ${clientUser.id} FOR UPDATE`;
      const locked = await tx.clientUser.findUnique({ where: { id: clientUser.id } });
      assertAccidentalFixture(client, locked, now);

      await tx.clientTrustedDevice.deleteMany({ where: { userId: clientUser.id } });
      await tx.magicLink.updateMany({ where: { userId: clientUser.id, usedAt: null }, data: { usedAt: now } });
      await tx.clientPasswordResetToken.updateMany({ where: { clientUserId: clientUser.id, usedAt: null }, data: { usedAt: now } });
      await tx.clientUser.update({
        where: { id: clientUser.id },
        data: {
          email: retiredEmail,
          isActive: false,
          sessionVersion: { increment: 1 },
          mfaCode: null,
          mfaCodeExpiry: null,
          populationPermissions: [],
          operationalReviewPermissions: [],
          correctiveActionPermissions: [],
          incidentPermissions: [],
          buildingIds: [],
        },
      });
      await tx.client.update({ where: { id: client.id }, data: { contactEmail: null, isActive: false } });
      await tx.clientSecurityAuditEvent.create({
        data: { clientUserId: clientUser.id, organizationId: clientUser.organizationId, eventType: 'QA_CLIENT_USER_REMEDIATED_AND_REVOKED' },
      });
      await tx.adminAuditEvent.create({
        data: {
          actorType: 'SYSTEM', systemActorKey: 'GOVERNED_CLIENT_EMAIL_QA_REMEDIATION',
          actorDisplayName: 'Governed production maintenance', actorRole: 'SYSTEM',
          action: 'CLIENT_USER_QA_REMEDIATED', targetType: 'ClientUser', targetId: clientUser.id,
          targetLabel: 'Synthetic email acceptance identity', organizationId: clientUser.organizationId,
          reason: 'Remove accidentally provisioned organization-scoped QA identity and revoke all access.',
          requestId: env.GITHUB_RUN_ID || null,
          beforeData: { active: true, role: clientUser.role, organizationId: clientUser.organizationId, clientId: clientUser.clientId },
          afterData: { active: false, sessionRevoked: true, linksInvalidated: true, addressRetired: true },
        },
      });

      await tx.organization.upsert({
        where: { id: QA_ORGANIZATION_ID },
        update: { name: QA_ORGANIZATION_NAME, isActive: true },
        create: { id: QA_ORGANIZATION_ID, name: QA_ORGANIZATION_NAME, isActive: true },
      });
      await tx.client.upsert({
        where: { id: QA_CLIENT_ID },
        update: { name: QA_CLIENT_NAME, organizationId: QA_ORGANIZATION_ID, isActive: true },
        create: { id: QA_CLIENT_ID, name: QA_CLIENT_NAME, organizationId: QA_ORGANIZATION_ID, regulatoryRequirements: [], isActive: true },
      });
      await tx.building.upsert({
        where: { id: QA_BUILDING_ID },
        update: { name: QA_BUILDING_NAME, organizationId: QA_ORGANIZATION_ID, clientId: QA_CLIENT_ID, isActive: true },
        create: {
          id: QA_BUILDING_ID, name: QA_BUILDING_NAME, address: '1000 Rue Synthétique', city: 'Montréal', province: 'QC',
          postalCode: 'H0H 0H0', organizationId: QA_ORGANIZATION_ID, clientId: QA_CLIENT_ID, isActive: true,
        },
      });
    });

    const afterStatus = await requestMe(oldToken);
    if (afterStatus !== 401) throw new Error(`Revoked session was not rejected; HTTP ${afterStatus}.`);
    const [retired, freshEmailOwner, internalUsersAfter, openMagic, openReset, trustedDevices] = await Promise.all([
      prisma.clientUser.findUnique({ where: { id: clientUser.id } }),
      prisma.clientUser.findUnique({ where: { email: RECIPIENT } }),
      prisma.user.findMany({ where: { email: { equals: RECIPIENT, mode: 'insensitive' } }, select: { id: true, updatedAt: true } }),
      prisma.magicLink.count({ where: { userId: clientUser.id, usedAt: null } }),
      prisma.clientPasswordResetToken.count({ where: { clientUserId: clientUser.id, usedAt: null } }),
      prisma.clientTrustedDevice.count({ where: { userId: clientUser.id } }),
    ]);
    if (!retired || retired.isActive || freshEmailOwner || openMagic || openReset || trustedDevices) throw new Error('Post-remediation invariant failed.');
    if (JSON.stringify(internalUsers) !== JSON.stringify(internalUsersAfter)) throw new Error('Internal User identity changed.');

    return {
      schemaVersion: 1, execution: 'PASS', productionMutation: true,
      accidentalClientId: client.id, remediatedClientUserId: clientUser.id,
      clientUserDisabled: true, sessionVersionIncremented: retired.sessionVersion === clientUser.sessionVersion + 1,
      priorSessionHttpStatus: afterStatus, activeMagicLinks: openMagic, activePasswordResetLinks: openReset,
      trustedDevices, internalUserUnchanged: true,
      qaOrganizationId: QA_ORGANIZATION_ID, qaClientId: QA_CLIENT_ID, qaBuildingId: QA_BUILDING_ID,
      qaClientUserCreated: false, recipientReleasedForGovernedProvisioning: true,
    };
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  run().then((result) => process.stdout.write(`${JSON.stringify(result)}\n`)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { assertApproval, assertAccidentalFixture, assertQaCollision, run };
