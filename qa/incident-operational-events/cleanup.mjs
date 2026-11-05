import { createRequire } from 'node:module';

if (!process.env.DATABASE_URL?.includes('127.0.0.1:55444/coro_qa_global_e2e')) {
  throw new Error('Refusing non-isolated incident operational events database');
}
const require = createRequire(new URL('../../coro-backend/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
try {
  await prisma.incidentAuthorityAssignment.updateMany({
    where: { organizationId: '10000000-0000-4000-8000-000000000002', grantedById: 'incident-operational-events-qa' },
    data: { status: 'REVOKED', revokedByType: 'SYSTEM', revokedById: 'incident-operational-events-qa', revokedAt: new Date(), revocationReason: 'QA campaign complete' },
  });
  await prisma.incidentEvent.updateMany({
    where: { organizationId: '10000000-0000-4000-8000-000000000002', description: { startsWith: '[QA-OPERATIONAL-EVENT]' } },
    data: { isActive: false, publicAccessToken: null, publicAccessRevokedAt: new Date() },
  });
  await prisma.clientUser.update({
    where: { id: '70000000-0000-4000-8000-000000000007' },
    data: { incidentPermissions: [] },
  });
  const activeIncidents = await prisma.incidentEvent.count({
    where: { description: { startsWith: '[QA-OPERATIONAL-EVENT]' }, isActive: true },
  });
  const residualAssignments = await prisma.incidentAuthorityAssignment.count({
    where: { grantedById: 'incident-operational-events-qa', status: 'ACTIVE' },
  });
  console.log(JSON.stringify({ status: activeIncidents === 0 && residualAssignments === 0 ? 'PASS' : 'FAIL', activeIncidents, residualAssignments, auditEvidencePreserved: true }));
} finally {
  await prisma.$disconnect();
}
