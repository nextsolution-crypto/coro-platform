import { createRequire } from 'node:module';

if (!process.env.DATABASE_URL?.includes('127.0.0.1:55444/coro_qa_global_e2e')) {
  throw new Error('Refusing non-isolated incident operational events database');
}

const require = createRequire(new URL('../../coro-backend/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ids = Object.freeze({
  org: '10000000-0000-4000-8000-000000000002',
  client: '30000000-0000-4000-8000-000000000001',
  building: '40000000-0000-4000-8000-000000000001',
  project: '50000000-0000-4000-8000-000000000001',
  document: '8f9b2b26-0343-4d3d-a6d4-100000000001',
  actor: '70000000-0000-4000-8000-000000000007',
  assignment: 'incident-operational-events-building-authority',
});

try {
  await prisma.incidentAuthorityAssignment.deleteMany({
    where: { organizationId: ids.org, grantedById: 'incident-operational-events-qa' },
  });
  await prisma.clientUser.update({
    where: { id: ids.actor },
    data: {
      isActive: true,
      incidentPermissions: [
        'INCIDENT_READ',
        'INCIDENT_TASK_PARTICIPATE',
        'INCIDENT_SUPERVISE',
        'INCIDENT_COMMAND',
      ],
    },
  });
  await prisma.incidentAuthorityAssignment.upsert({
    where: { id: ids.assignment },
    update: {
      status: 'ACTIVE',
      permissions: ['INCIDENT_READ', 'INCIDENT_TASK_PARTICIPATE', 'INCIDENT_SUPERVISE', 'INCIDENT_COMMAND'],
      revokedByType: null,
      revokedById: null,
      revokedAt: null,
      revocationReason: null,
    },
    create: {
      id: ids.assignment,
      organizationId: ids.org,
      buildingId: ids.building,
      subjectType: 'CLIENT_USER',
      subjectId: ids.actor,
      operationalRole: 'INCIDENT_COMMANDER',
      permissions: ['INCIDENT_READ', 'INCIDENT_TASK_PARTICIPATE', 'INCIDENT_SUPERVISE', 'INCIDENT_COMMAND'],
      grantedByType: 'SYSTEM',
      grantedById: 'incident-operational-events-qa',
      grantReason: 'Disposable isolated operational events acceptance',
    },
  });
  await prisma.project.update({
    where: { id: ids.project },
    data: {
      status: 'VALIDATED',
      isActive: true,
      configData: {
        buildingType: 'Commercial synthetic QA',
        pointRassemblement: 'Synthetic assembly point',
        panneauAlarme: true,
        panneauLocalisation: 'QA fire command room',
        gicleurs: true,
        salleGicleurs: 'QA sprinkler room',
        pompeIncendie: true,
        pompeIncendieLieu: 'QA pump room',
        ascenseurPompier: true,
        ascenseurPompierLequel: 'QA elevator 1',
        matieresDangereuses: true,
        matieresList: ['Synthetic test substance'],
      },
    },
  });
  await prisma.document.upsert({
    where: { id: ids.document },
    update: {
      projectId: ids.project,
      version: 7,
      status: 'VALIDATED',
      content: { module2: { emergencyServices: '911', maintenance: 'Synthetic provider — no external call' } },
    },
    create: {
      id: ids.document,
      projectId: ids.project,
      title: 'Synthetic approved PMU source',
      version: 7,
      status: 'VALIDATED',
      content: { module2: { emergencyServices: '911', maintenance: 'Synthetic provider — no external call' } },
    },
  });
  console.log(JSON.stringify({ status: 'PASS', ...ids }));
} finally {
  await prisma.$disconnect();
}
