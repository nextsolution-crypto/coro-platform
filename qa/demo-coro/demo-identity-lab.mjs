#!/usr/bin/env node
import bcrypt from '../../coro-backend/node_modules/bcryptjs/index.js';
import { PrismaClient } from '../../coro-backend/node_modules/@prisma/client/default.js';
import { loadSecretStore } from '../global-e2e/src/secret-store.mjs';

const TARGET_ORGANIZATION_ID = '916f54ec-af22-45e0-99db-a369d9630002';
const ADVISOR_ID = 'd3000000-0000-4000-8000-000000000001';
const ADVISOR_FIXTURE_EMAIL = 'advisor-demo@presentation.invalid';
const CLIENT_ID = 'd3000001-0000-4000-8000-000000000001';
const BUILDING_ID = 'd3000002-0000-4000-8000-000000000001';

export const demoActors = Object.freeze({
  advisor: {
    id: ADVISOR_ID,
    email: 'demo-advisor@global-e2e.test',
    kind: 'internal',
    role: 'OPERATOR',
  },
  clientResponsible: {
    id: 'd3000013-0000-4000-8000-000000000001',
    email: 'demo-corporate@global-e2e.test',
    kind: 'portal',
    role: 'CLIENT_CORPORATE',
    buildingIds: [],
  },
  buildingManager: {
    id: 'd3000013-0000-4000-8000-000000000002',
    email: 'demo-manager@global-e2e.test',
    kind: 'portal',
    role: 'CLIENT_MANAGER',
    buildingIds: [BUILDING_ID],
  },
});

function assertQaDatabase() {
  const url = process.env.DATABASE_URL || '';
  if (process.env.CORO_DEMO_IDENTITY_QA !== 'true' || !url.includes('coro_demo_qa')) {
    throw new Error('QA_DATABASE_GUARD_FAILED');
  }
}

async function assertTarget(prisma) {
  const [environment, client, building, advisor] = await Promise.all([
    prisma.demoEnvironment.findUnique({ where: { organizationId: TARGET_ORGANIZATION_ID } }),
    prisma.client.findFirst({ where: { id: CLIENT_ID, organizationId: TARGET_ORGANIZATION_ID }, select: { id: true } }),
    prisma.building.findFirst({ where: { id: BUILDING_ID, clientId: CLIENT_ID, organizationId: TARGET_ORGANIZATION_ID }, select: { id: true } }),
    prisma.user.findFirst({ where: { id: ADVISOR_ID, organizationId: TARGET_ORGANIZATION_ID }, select: { id: true, email: true } }),
  ]);
  if (!environment || environment.status !== 'ACTIVE' || environment.communicationMode !== 'SIMULATE' || environment.externalProvidersDisabled !== true) {
    throw new Error('DEMO_ENVIRONMENT_NOT_PREPARED');
  }
  if (!client || !building || !advisor) throw new Error('DEMO_IDENTITY_PREREQUISITES_MISSING');
  if (![ADVISOR_FIXTURE_EMAIL, demoActors.advisor.email].includes(advisor.email)) throw new Error('DEMO_ADVISOR_COLLISION');
}

export async function prepareDemoIdentities(prisma) {
  await assertTarget(prisma);
  const secrets = await loadSecretStore();
  const password = await bcrypt.hash(secrets.syntheticPassword, 10);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: ADVISOR_ID },
      data: {
        email: demoActors.advisor.email,
        password,
        firstName: 'Conseiller',
        lastName: 'Démo',
        role: 'OPERATOR',
        isActive: true,
      },
    });
    for (const actor of [demoActors.clientResponsible, demoActors.buildingManager]) {
      const collision = await tx.clientUser.findUnique({ where: { email: actor.email }, select: { id: true } });
      if (collision && collision.id !== actor.id) throw new Error('DEMO_CLIENT_USER_COLLISION');
      await tx.clientUser.upsert({
        where: { id: actor.id },
        create: {
          id: actor.id,
          email: actor.email,
          password,
          firstName: actor.role === 'CLIENT_CORPORATE' ? 'Responsable' : 'Gestionnaire',
          lastName: 'Démo',
          role: actor.role,
          buildingIds: actor.buildingIds,
          clientId: CLIENT_ID,
          organizationId: TARGET_ORGANIZATION_ID,
          isActive: true,
        },
        update: {
          email: actor.email,
          password,
          role: actor.role,
          buildingIds: actor.buildingIds,
          clientId: CLIENT_ID,
          organizationId: TARGET_ORGANIZATION_ID,
          isActive: true,
          sessionVersion: { increment: 1 },
          mfaCode: null,
          mfaCodeExpiry: null,
        },
      });
    }
  });
  return { command: 'prepare', actors: Object.keys(demoActors), communicationMode: 'SIMULATE', externalProvidersDisabled: true };
}

export async function resetDemoIdentities(prisma) {
  await prisma.$transaction(async (tx) => {
    const clientUserIds = [demoActors.clientResponsible.id, demoActors.buildingManager.id];
    await tx.clientTrustedDevice.deleteMany({ where: { userId: { in: clientUserIds } } });
    await tx.clientPasswordResetToken.deleteMany({ where: { clientUserId: { in: clientUserIds } } });
    await tx.magicLink.deleteMany({ where: { userId: { in: clientUserIds } } });
    await tx.clientUser.updateMany({
      where: { id: { in: clientUserIds }, organizationId: TARGET_ORGANIZATION_ID },
      data: { isActive: false, sessionVersion: { increment: 1 }, mfaCode: null, mfaCodeExpiry: null },
    });
    await tx.refreshToken.deleteMany({ where: { userId: ADVISOR_ID } });
    await tx.trustedDevice.deleteMany({ where: { userId: ADVISOR_ID } });
    await tx.platformMfaChallenge.deleteMany({ where: { userId: ADVISOR_ID } });
    await tx.user.update({
      where: { id: ADVISOR_ID },
      data: { email: ADVISOR_FIXTURE_EMAIL, isActive: false },
    });
  });
  return { command: 'reset', residualAccess: false, actors: Object.keys(demoActors) };
}

export async function verifyDemoIdentities(prisma) {
  const [advisor, clientUsers, refreshTokens, trustedDevices, magicLinks] = await Promise.all([
    prisma.user.findUnique({ where: { id: ADVISOR_ID }, select: { email: true, role: true, isActive: true, organizationId: true } }),
    prisma.clientUser.findMany({ where: { id: { in: [demoActors.clientResponsible.id, demoActors.buildingManager.id] } }, select: { id: true, role: true, isActive: true, clientId: true, organizationId: true, buildingIds: true } }),
    prisma.refreshToken.count({ where: { userId: ADVISOR_ID } }),
    prisma.trustedDevice.count({ where: { userId: ADVISOR_ID } }),
    prisma.magicLink.count({ where: { userId: { in: [demoActors.clientResponsible.id, demoActors.buildingManager.id] } } }),
  ]);
  return { command: 'verify', advisor, clientUsers, residual: { refreshTokens, trustedDevices, magicLinks } };
}

async function main() {
  assertQaDatabase();
  const command = process.argv[2] || 'verify';
  const prisma = new PrismaClient();
  try {
    const result = command === 'prepare' ? await prepareDemoIdentities(prisma) : command === 'reset' ? await resetDemoIdentities(prisma) : command === 'verify' ? await verifyDemoIdentities(prisma) : null;
    if (!result) throw new Error('UNKNOWN_COMMAND');
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({ execution: 'FAILED', reason: error.message })}\n`);
    process.exitCode = 1;
  });
}
