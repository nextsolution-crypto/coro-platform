import { createRequire } from 'node:module';

const require = createRequire(new URL('../../coro-backend/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');

if (!process.env.DATABASE_URL?.includes('127.0.0.1:55442/coro_qa_p42')) {
  throw new Error('Refusing non-P42 QA database');
}

const prisma = new PrismaClient();
const ids = {
  organization: '10000000-0000-4000-8000-000000000002',
  building: '40000000-0000-4000-8000-000000000001',
  actor: '70000000-0000-4000-8000-000000000007',
};
const permissions = [
  'INCIDENT_READ',
  'INCIDENT_TASK_PARTICIPATE',
  'INCIDENT_SUPERVISE',
  'INCIDENT_COMMAND',
  'PCA_ACTIVATE',
];

try {
  await prisma.clientUser.update({
    where: { id: ids.actor },
    data: { incidentPermissions: permissions },
  });
  await prisma.incidentAuthorityAssignment.upsert({
    where: { id: 'p42-corporate-building-authority' },
    update: { status: 'ACTIVE', permissions },
    create: {
      id: 'p42-corporate-building-authority',
      organizationId: ids.organization,
      buildingId: ids.building,
      subjectType: 'CLIENT_USER',
      subjectId: ids.actor,
      operationalRole: 'INCIDENT_COMMANDER',
      permissions,
      grantedByType: 'SYSTEM',
      grantedById: 'p42-qa-fixture',
      grantReason: 'Explicit P-4.2 browser prerequisite',
    },
  });

  const responders = [
    ['p42-primary', 'Primary', 'Responder'],
    ['p42-alternate-1', 'Alternate', 'One'],
    ['p42-alternate-2', 'Alternate', 'Two'],
  ];
  for (const [id, firstName, lastName] of responders) {
    await prisma.buildingEmployee.upsert({
      where: { id },
      update: { isActive: true, organizationId: ids.organization, buildingId: ids.building },
      create: {
        id,
        organizationId: ids.organization,
        buildingId: ids.building,
        firstName,
        lastName,
        email: `${id}@global-e2e.test`,
        isActive: true,
      },
    });
  }

  console.log(JSON.stringify({ status: 'PASS', ...ids, responders: responders.map(([id]) => id) }));
} finally {
  await prisma.$disconnect();
}
