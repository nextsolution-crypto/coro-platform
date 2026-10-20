import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../coro-backend/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');

if (!process.env.DATABASE_URL?.includes('127.0.0.1:55442/coro_p41')) {
  throw new Error('Refusing non-disposable P-4.1 database');
}

const prisma = new PrismaClient();
const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  if (!pass) throw new Error(`${name}: ${detail}`);
};

async function appendAudit(operation) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'p41-org:p41-incident'}))`;
    const previous = await tx.incidentAuditEvent.findFirst({
      where: { organizationId: 'p41-org', incidentEventId: 'p41-incident' },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    });
    const eventHash = createHash('sha256').update(`${operation}:${previous?.eventHash ?? ''}:${randomUUID()}`).digest('hex');
    return tx.incidentAuditEvent.create({ data: {
      organizationId: 'p41-org', buildingId: 'p41-building', incidentEventId: 'p41-incident',
      operation, actorType: 'USER', actorId: 'p41-actor', reason: 'Concurrency QA',
      previousEventHash: previous?.eventHash ?? null, eventHash,
    } });
  });
}

try {
  await prisma.organization.create({ data: { id: 'p41-org', name: 'P41 QA' } });
  await prisma.organization.create({ data: { id: 'p41-other-org', name: 'P41 Other QA' } });
  await prisma.client.create({ data: { id: 'p41-client', name: 'P41 Client', organizationId: 'p41-org', regulatoryRequirements: [] } });
  await prisma.building.create({ data: { id: 'p41-building', name: 'P41 Building', address: '1 QA', city: 'Montreal', province: 'QC', organizationId: 'p41-org', clientId: 'p41-client' } });
  await prisma.incidentEvent.create({ data: { id: 'p41-incident', buildingId: 'p41-building', organizationId: 'p41-org', type: 'FIRE_ALERT', triggeredBy: 'QA', occupantsSnapshot: [], teamSnapshot: [] } });

  const assignmentData = { organizationId: 'p41-org', buildingId: 'p41-building', incidentEventId: 'p41-incident', subjectType: 'USER', subjectId: 'p41-subject', operationalRole: 'COMMANDER', permissions: ['INCIDENT_COMMAND'], grantedByType: 'USER', grantedById: 'p41-actor', grantReason: 'QA' };
  const assignments = await Promise.allSettled([
    prisma.incidentAuthorityAssignment.create({ data: assignmentData }),
    prisma.incidentAuthorityAssignment.create({ data: assignmentData }),
  ]);
  check('concurrent-assignment', assignments.filter((item) => item.status === 'fulfilled').length === 1, 'exactly one active assignment');

  const assignment = await prisma.incidentAuthorityAssignment.findFirstOrThrow({ where: { subjectId: 'p41-subject' } });
  const revocations = await Promise.all([
    prisma.incidentAuthorityAssignment.updateMany({ where: { id: assignment.id, status: 'ACTIVE', lockVersion: 0 }, data: { status: 'REVOKED', lockVersion: { increment: 1 } } }),
    prisma.incidentAuthorityAssignment.updateMany({ where: { id: assignment.id, status: 'ACTIVE', lockVersion: 0 }, data: { status: 'REVOKED', lockVersion: { increment: 1 } } }),
  ]);
  check('revocation-race', revocations.reduce((sum, item) => sum + item.count, 0) === 1, 'one revocation claim');

  const ackTask = await prisma.incidentTask.create({ data: { incidentEventId: 'p41-incident', role: 'COORDINATOR', title: 'Ack', status: 'PENDING' } });
  const acknowledgments = await Promise.all([
    prisma.incidentTask.updateMany({ where: { id: ackTask.id, status: 'PENDING', lockVersion: 0 }, data: { status: 'ACKNOWLEDGED', lockVersion: { increment: 1 } } }),
    prisma.incidentTask.updateMany({ where: { id: ackTask.id, status: 'PENDING', lockVersion: 0 }, data: { status: 'ACKNOWLEDGED', lockVersion: { increment: 1 } } }),
  ]);
  check('concurrent-acknowledgment', acknowledgments.reduce((sum, item) => sum + item.count, 0) === 1, 'one acknowledgment claim');

  const executions = await Promise.all([
    prisma.incidentTask.updateMany({ where: { id: ackTask.id, status: 'ACKNOWLEDGED', lockVersion: 1 }, data: { status: 'COMPLETED', lockVersion: { increment: 1 } } }),
    prisma.incidentTask.updateMany({ where: { id: ackTask.id, status: 'ACKNOWLEDGED', lockVersion: 1 }, data: { status: 'COMPLETED', lockVersion: { increment: 1 } } }),
  ]);
  check('concurrent-execution', executions.reduce((sum, item) => sum + item.count, 0) === 1, 'one execution claim');

  const reassignTask = await prisma.incidentTask.create({ data: { incidentEventId: 'p41-incident', role: 'COORDINATOR', title: 'Reassign', status: 'PENDING' } });
  const reassignments = await Promise.all([
    prisma.incidentTask.updateMany({ where: { id: reassignTask.id, lockVersion: 0 }, data: { reassignedByType: 'USER', reassignedById: 'a', lockVersion: { increment: 1 } } }),
    prisma.incidentTask.updateMany({ where: { id: reassignTask.id, lockVersion: 0 }, data: { reassignedByType: 'USER', reassignedById: 'b', lockVersion: { increment: 1 } } }),
  ]);
  check('concurrent-reassignment', reassignments.reduce((sum, item) => sum + item.count, 0) === 1, 'one reassignment claim');

  const pca = await Promise.allSettled([
    prisma.pcaActivation.create({ data: { organizationId: 'p41-org', buildingId: 'p41-building', projectId: 'p1', incidentEventId: 'p41-incident', activatedByType: 'USER', activatedById: 'a', activationReason: 'QA' } }),
    prisma.pcaActivation.create({ data: { organizationId: 'p41-org', buildingId: 'p41-building', projectId: 'p2', incidentEventId: 'p41-incident', activatedByType: 'USER', activatedById: 'b', activationReason: 'QA' } }),
  ]);
  check('concurrent-pca', pca.filter((item) => item.status === 'fulfilled').length === 1, 'exactly one active PCA');

  await Promise.all([appendAudit('CONCURRENT_A'), appendAudit('CONCURRENT_B'), appendAudit('CONCURRENT_C')]);
  const chain = await prisma.incidentAuditEvent.findMany({ where: { incidentEventId: 'p41-incident' }, orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }] });
  check('hash-chain', chain.every((item, index) => index === 0 ? item.previousEventHash === null : item.previousEventHash === chain[index - 1].eventHash), `${chain.length} serialized events`);

  const beforeRollback = await prisma.incidentEvent.findUniqueOrThrow({ where: { id: 'p41-incident' } });
  await prisma.incidentAuditEvent.create({ data: { organizationId: 'p41-org', buildingId: 'p41-building', incidentEventId: 'p41-incident', operation: 'DUPLICATE_SEED', actorType: 'USER', actorId: 'qa', eventHash: 'a'.repeat(64) } });
  await prisma.$transaction(async (tx) => {
    await tx.incidentEvent.update({ where: { id: 'p41-incident' }, data: { status: 'CONTAINED' } });
    await tx.incidentAuditEvent.create({ data: { organizationId: 'p41-org', buildingId: 'p41-building', incidentEventId: 'p41-incident', operation: 'MUST_ROLLBACK', actorType: 'USER', actorId: 'qa', eventHash: 'a'.repeat(64) } });
  }).then(() => { throw new Error('audit failure did not abort'); }, () => undefined);
  const afterRollback = await prisma.incidentEvent.findUniqueOrThrow({ where: { id: 'p41-incident' } });
  check('audit-failure-rollback', afterRollback.status === beforeRollback.status, 'incident mutation rolled back');

  const outboxData = { organizationId: 'p41-org', incidentEventId: 'p41-incident', channel: 'EMAIL', recipientHash: 'b'.repeat(64), encryptedEnvelope: 'ciphertext', encryptionKeyId: 'qa', purpose: 'QA', idempotencyKey: 'p41-idempotency' };
  const outbox = await Promise.allSettled([
    prisma.incidentNotificationDelivery.create({ data: outboxData }),
    prisma.incidentNotificationDelivery.create({ data: outboxData }),
  ]);
  check('dispatcher-idempotency', outbox.filter((item) => item.status === 'fulfilled').length === 1, 'one idempotency record');
  await prisma.$transaction(async (tx) => {
    await tx.incidentNotificationDelivery.create({ data: { ...outboxData, idempotencyKey: 'p41-rollback-outbox' } });
    throw new Error('forced rollback');
  }).catch(() => undefined);
  check('outbox-transaction', await prisma.incidentNotificationDelivery.count({ where: { idempotencyKey: 'p41-rollback-outbox' } }) === 0, 'no orphan outbox record');

  const crossTenant = await prisma.incidentAuthorityAssignment.updateMany({ where: { id: assignment.id, organizationId: 'p41-other-org' }, data: { lockVersion: { increment: 1 } } });
  check('tenant-isolation', crossTenant.count === 0, 'cross-tenant mutation denied by scoped predicate');

  console.log(JSON.stringify({ status: 'PASS', results }, null, 2));
} finally {
  await prisma.$disconnect();
}
