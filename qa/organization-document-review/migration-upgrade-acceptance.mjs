#!/usr/bin/env node
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { assertUnderQaRoot } from '../global-e2e/src/policy.mjs';

const databaseUrl = process.env.DATABASE_URL;
const phase = process.argv[2];
if (!databaseUrl || !['seed-159', 'verify-160'].includes(phase)) throw new Error('Upgrade QA configuration incomplete');
const target = new URL(databaseUrl);
if (target.hostname !== '127.0.0.1' || target.pathname !== '/coro_qa_upgrade') throw new Error('Refusing non-disposable upgrade database');
const require = createRequire(resolve('coro-backend/package.json'));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const ids = { org: 'pr124-upgrade-org', user: 'pr124-upgrade-user', client: 'pr124-upgrade-client', building: 'pr124-upgrade-building', project: 'pr124-upgrade-project', document: 'pr124-upgrade-document', version: 'pr124-upgrade-version', audit: 'pr124-upgrade-audit' };
let result;
try {
  if (phase === 'seed-159') {
    await prisma.organization.create({ data: { id: ids.org, name: 'PR124 Upgrade Organization' } });
    await prisma.user.create({ data: { id: ids.user, email: 'pr124-upgrade@example.invalid', password: 'synthetic-not-a-login', firstName: 'Upgrade', lastName: 'Actor', role: 'ADMIN', organizationId: ids.org } });
    await prisma.client.create({ data: { id: ids.client, name: 'PR124 Upgrade Client', organizationId: ids.org, regulatoryRequirements: [] } });
    await prisma.building.create({ data: { id: ids.building, name: 'PR124 Upgrade Building', address: '1 Synthetic', city: 'Montreal', province: 'QC', organizationId: ids.org, clientId: ids.client } });
    await prisma.project.create({ data: { id: ids.project, name: 'Historical approved document', documentType: 'PMU', status: 'VALIDATED', year: 2026, progress: 100, organizationId: ids.org, clientId: ids.client, buildingId: ids.building, userId: ids.user, approvedById: ids.user, approvedAt: new Date('2026-10-01T12:00:00Z') } });
    await prisma.document.create({ data: { id: ids.document, title: 'Historical PMU', status: 'VALIDATED', version: 4, lockVersion: 7, content: { historical: true, exact: 'preserve-me' }, projectId: ids.project } });
    await prisma.projectVersion.create({ data: { id: ids.version, projectId: ids.project, versionNumber: 4, label: 'Historical approved v4', snapshot: { historical: true, exact: 'preserve-me' } } });
    await prisma.auditLog.create({ data: { id: ids.audit, action: 'HISTORICAL_APPROVAL', entityType: 'PROJECT', entityId: ids.project, projectId: ids.project, description: 'Pre-migration synthetic approval', metadata: { historical: true }, userId: ids.user, organizationId: ids.org } });
    result = { phase, seeded: true, projectStatus: 'VALIDATED', documentVersion: 4 };
  } else {
    const [project, document, version, audit, reviewRequests, outboxEvents] = await Promise.all([
      prisma.project.findUnique({ where: { id: ids.project } }), prisma.document.findUnique({ where: { id: ids.document } }),
      prisma.projectVersion.findUnique({ where: { id: ids.version } }), prisma.auditLog.findUnique({ where: { id: ids.audit } }),
      prisma.documentReviewRequest.count({ where: { projectId: ids.project } }), prisma.documentReviewNotificationEvent.count({ where: { projectId: ids.project } }),
    ]);
    const pass = project?.status === 'VALIDATED' && document?.version === 4 && document?.lockVersion === 7 && document?.content?.exact === 'preserve-me' && version?.snapshot?.exact === 'preserve-me' && audit?.action === 'HISTORICAL_APPROVAL' && reviewRequests === 0 && outboxEvents === 0;
    result = { phase, pass, preserved: { projectStatus: project?.status, documentVersion: document?.version, lockVersion: document?.lockVersion, content: document?.content?.exact, projectVersion: version?.snapshot?.exact, audit: audit?.action }, retrospectiveReviewRequests: reviewRequests, retrospectiveOutboxEvents: outboxEvents };
    if (!pass) process.exitCode = 1;
  }
  const output = assertUnderQaRoot(process.env.CORO_QA_UPGRADE_EVIDENCE);
  await writeFile(output, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await prisma.$disconnect(); }
