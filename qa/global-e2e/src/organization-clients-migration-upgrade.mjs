#!/usr/bin/env node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { assertUnderQaRoot } from './policy.mjs';

if (!process.env.DATABASE_URL?.includes('127.0.0.1')) throw new Error('Isolated loopback PostgreSQL is required.');
const root = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const require = createRequire(join(root, 'coro-backend', 'package.json'));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const organizationId = '10000000-0000-4000-8000-000000000002';
const id = 'clients-historical-upgrade-fixture';
const rollbackClientId = 'clients-sql-rollback-fixture';
const rollbackUserId = 'clients-sql-rollback-user';
const output = assertUnderQaRoot(process.env.CORO_QA_CLIENTS_MIGRATION_EVIDENCE || 'D:\\CORO-QA\\tracking\\organization-clients\\migration-upgrade.json');
let report;
try {
  await prisma.client.upsert({
    where: { id }, update: {},
    create: { id, name: 'Client historique pre-migration', organizationId, regulatoryRequirements: [] },
  });
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "ClientInvitationEvent" CASCADE');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "ClientProvisioningRequest" CASCADE');
  await prisma.$executeRawUnsafe('DROP TYPE IF EXISTS "ClientInvitationEventStatus"');
  await prisma.$executeRawUnsafe('DELETE FROM "_prisma_migrations" WHERE migration_name = \'20261116010000_client_provisioning_integrity\'');
  const command = process.platform === 'win32' ? '.\\node_modules\\.bin\\prisma.cmd' : './node_modules/.bin/prisma';
  const migration = spawnSync(command, ['migrate', 'deploy'], { cwd: join(root, 'coro-backend'), env: process.env, encoding: 'utf8', shell: process.platform === 'win32' });

  let rollbackRaised = false;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.client.create({ data: { id: rollbackClientId, name: 'Rollback SQL QA', organizationId, regulatoryRequirements: [] } });
      await tx.clientUser.create({ data: { id: rollbackUserId, email: 'clients-sql-rollback@global-e2e.test', password: 'synthetic-not-a-real-secret', firstName: 'Rollback', lastName: 'QA', buildingIds: [], clientId: rollbackClientId, organizationId } });
      await tx.clientInvitationEvent.create({ data: { organizationId, clientId: rollbackClientId, clientUserId: rollbackUserId, idempotencyKey: 'clients-sql-rollback-event', recipientHash: '0'.repeat(64), encryptedEnvelope: 'synthetic-envelope', encryptionKeyId: 'qa' } });
      await tx.clientProvisioningRequest.create({ data: { organizationId, actorUserId: '10000000-0000-4000-8000-000000000101', idempotencyKey: 'clients-sql-rollback-request', payloadHash: '0'.repeat(64), clientId: rollbackClientId } });
      throw new Error('QA_FORCED_SQL_ROLLBACK');
    });
  } catch (error) {
    rollbackRaised = error instanceof Error && error.message === 'QA_FORCED_SQL_ROLLBACK';
  }

  const [historical, applied, outboxRows, requestRows, rollbackClients, rollbackUsers, rollbackEvents, rollbackRequests] = await Promise.all([
    prisma.client.findUnique({ where: { id } }),
    prisma.$queryRawUnsafe('SELECT migration_name, finished_at FROM "_prisma_migrations" WHERE migration_name = \'20261116010000_client_provisioning_integrity\''),
    prisma.clientInvitationEvent.count(),
    prisma.clientProvisioningRequest.count(),
    prisma.client.count({ where: { id: rollbackClientId } }),
    prisma.clientUser.count({ where: { id: rollbackUserId } }),
    prisma.clientInvitationEvent.count({ where: { idempotencyKey: 'clients-sql-rollback-event' } }),
    prisma.clientProvisioningRequest.count({ where: { idempotencyKey: 'clients-sql-rollback-request' } }),
  ]);
  const historicalPreserved = historical?.name === 'Client historique pre-migration';
  const sqlRollbackPass = rollbackRaised && rollbackClients === 0 && rollbackUsers === 0 && rollbackEvents === 0 && rollbackRequests === 0;
  report = {
    status: migration.status === 0 && historicalPreserved && applied.length === 1 && sqlRollbackPass ? 'PASS' : 'FAIL',
    migrationExitCode: migration.status,
    historicalPreserved,
    migrationApplied: applied.length === 1,
    sqlRollbackPass,
    rollbackCounts: { clients: rollbackClients, users: rollbackUsers, events: rollbackEvents, requests: rollbackRequests },
    outboxRows,
    requestRows,
  };
} finally {
  await prisma.client.deleteMany({ where: { id } }).catch(() => undefined);
  await prisma.$disconnect();
}
await mkdir(resolve(output, '..'), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.status !== 'PASS') process.exitCode = 1;
