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
const fixtureId = 'incident-authority-historical-upgrade-fixture';
const fixtureSubjectId = '70000000-0000-4000-8000-000000000007';
const migrationName = '20261121010000_incident_authority_idempotency';
const parentMigrationName = '20261120010000_permanent_qr_codes';
const output = assertUnderQaRoot(process.env.CORO_QA_INCIDENT_AUTH_MIGRATION_EVIDENCE || 'D:\\CORO-QA\\tracking\\organization-incident-authorizations\\migration-upgrade.json');
let report;
try {
  await prisma.incidentAuthorityAssignment.deleteMany({ where: { id: fixtureId } });
  await prisma.incidentAuthorityAssignment.create({ data: {
    id: fixtureId, organizationId: '10000000-0000-4000-8000-000000000002', buildingId: '40000000-0000-4000-8000-000000000001',
    subjectType: 'CLIENT_USER', subjectId: fixtureSubjectId, operationalRole: 'Historique QA',
    permissions: ['INCIDENT_READ'], grantedByType: 'USER', grantedById: '20000000-0000-4000-8000-000000000005', grantReason: 'Fixture historique additive',
  } });
  const permissionsBefore = (await prisma.clientUser.findUniqueOrThrow({ where: { id: fixtureSubjectId }, select: { incidentPermissions: true } })).incidentPermissions;
  await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS "IncidentAuthorityAssignment_organizationId_idempotencyKey_key"');
  await prisma.$executeRawUnsafe('ALTER TABLE "IncidentAuthorityAssignment" DROP COLUMN IF EXISTS "payloadHash", DROP COLUMN IF EXISTS "idempotencyKey"');
  await prisma.$executeRawUnsafe(`DELETE FROM "_prisma_migrations" WHERE migration_name = '${migrationName}'`);
  const command = process.platform === 'win32' ? '.\\node_modules\\.bin\\prisma.cmd' : './node_modules/.bin/prisma';
  const migration = spawnSync(command, ['migrate', 'deploy'], { cwd: join(root, 'coro-backend'), env: process.env, encoding: 'utf8', shell: process.platform === 'win32' });
  const preserved = await prisma.incidentAuthorityAssignment.findUnique({ where: { id: fixtureId } });
  const permissionsAfter = (await prisma.clientUser.findUniqueOrThrow({ where: { id: fixtureSubjectId }, select: { incidentPermissions: true } })).incidentPermissions;
  const applied = await prisma.$queryRawUnsafe(`SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = '${migrationName}'`);
  const parentApplied = await prisma.$queryRawUnsafe(`SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = '${parentMigrationName}'`);
  const noImplicitPermissions = JSON.stringify(permissionsAfter) === JSON.stringify(permissionsBefore);
  report = {
    status: migration.status === 0 && preserved?.grantReason === 'Fixture historique additive' && applied.length === 1 && parentApplied.length === 1 && noImplicitPermissions ? 'PASS' : 'FAIL',
    migrationExitCode: migration.status,
    parentMigrationApplied: parentApplied.length === 1,
    historicalAssignmentPreserved: preserved?.grantReason === 'Fixture historique additive',
    migrationApplied: applied.length === 1,
    noImplicitPermissions,
    stderr: migration.status === 0 ? undefined : migration.stderr?.slice(0, 1000),
  };
} finally {
  await prisma.incidentAuthorityAssignment.deleteMany({ where: { id: fixtureId } }).catch(() => undefined);
  await prisma.$disconnect();
}
await mkdir(resolve(output, '..'), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.status !== 'PASS') process.exitCode = 1;
