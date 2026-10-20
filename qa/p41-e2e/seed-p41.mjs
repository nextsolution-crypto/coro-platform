import { createRequire } from 'node:module';

const require = createRequire(new URL('../../coro-backend/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
if (!process.env.DATABASE_URL?.includes('127.0.0.1:55442/coro_qa_p41')) throw new Error('Refusing non-P41 QA database');
const prisma = new PrismaClient();

const ids = {
  org: '10000000-0000-4000-8000-000000000002',
  client: '30000000-0000-4000-8000-000000000001',
  building: '40000000-0000-4000-8000-000000000001',
  actor: '70000000-0000-4000-8000-000000000007',
  advisor: '20000000-0000-4000-8000-000000000007',
  pca: '50000000-0000-4000-8000-000000000041',
};

try {
  await prisma.pcaActivation.updateMany({ where: { organizationId: ids.org, buildingId: ids.building, status: 'ACTIVE' }, data: { status: 'REVOKED', revokedByType: 'SYSTEM', revokedById: 'p41-qa-reset', revokedAt: new Date(), revocationReason: 'Disposable browser fixture reset' } });
  await prisma.clientUser.update({ where: { id: ids.actor }, data: { incidentPermissions: ['INCIDENT_READ', 'INCIDENT_TASK_PARTICIPATE', 'INCIDENT_SUPERVISE', 'INCIDENT_COMMAND', 'PCA_ACTIVATE'] } });
  await prisma.incidentAuthorityAssignment.upsert({
    where: { id: 'p41-corporate-building-authority' },
    update: { status: 'ACTIVE', permissions: ['INCIDENT_READ', 'INCIDENT_TASK_PARTICIPATE', 'INCIDENT_SUPERVISE', 'INCIDENT_COMMAND', 'PCA_ACTIVATE'] },
    create: { id: 'p41-corporate-building-authority', organizationId: ids.org, buildingId: ids.building, subjectType: 'CLIENT_USER', subjectId: ids.actor, operationalRole: 'INCIDENT_COMMANDER', permissions: ['INCIDENT_READ', 'INCIDENT_TASK_PARTICIPATE', 'INCIDENT_SUPERVISE', 'INCIDENT_COMMAND', 'PCA_ACTIVATE'], grantedByType: 'SYSTEM', grantedById: 'p41-qa-fixture', grantReason: 'Explicit P-4.1 browser prerequisite' },
  });
  await prisma.project.upsert({
    where: { id: ids.pca }, update: { status: 'VALIDATED', isActive: true },
    create: { id: ids.pca, name: 'Synthetic P41 PCA', documentType: 'PCA', status: 'VALIDATED', year: 2026, isActive: true, organizationId: ids.org, clientId: ids.client, buildingId: ids.building, userId: ids.advisor },
  });
  const employee = await prisma.buildingEmployee.upsert({
    where: { id: 'p41-employee' }, update: { isActive: true },
    create: { id: 'p41-employee', buildingId: ids.building, organizationId: ids.org, firstName: 'Synthetic', lastName: 'Responder', email: 'responder@global-e2e.test', isActive: true },
  });
  console.log(JSON.stringify({ status: 'PASS', buildingId: ids.building, actorId: ids.actor, pcaProjectId: ids.pca, employeeId: employee.id }));
} finally {
  await prisma.$disconnect();
}
