#!/usr/bin/env node
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { assertDisposableDatabase } from '../global-e2e/src/database-policy.mjs';
import { assertSafeEnvironment } from '../global-e2e/src/policy.mjs';

assertSafeEnvironment();
assertDisposableDatabase();
const dependencyRoot = resolve(process.env.CORO_QA_DEPENDENCY_ROOT || 'coro-backend');
const require = createRequire(join(dependencyRoot, 'package.json'));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ids = {
  orgA: '10000000-0000-4000-8000-000000000002',
  adminA: '20000000-0000-4000-8000-000000000005',
  advisorA: '20000000-0000-4000-8000-000000000007',
  clientA: '30000000-0000-4000-8000-000000000001',
  buildingA: '40000000-0000-4000-8000-000000000001',
  hiddenProject: '50000000-0000-4000-8000-000000000099',
};

try {
  await prisma.project.upsert({
    where: { id: ids.hiddenProject },
    update: { name: 'Dashboard Hidden Admin Project', userId: ids.adminA, lastEditedById: null, isActive: true, status: 'IN_PROGRESS' },
    create: {
      id: ids.hiddenProject,
      name: 'Dashboard Hidden Admin Project',
      documentType: 'PCA',
      year: 2026,
      organizationId: ids.orgA,
      clientId: ids.clientA,
      buildingId: ids.buildingA,
      userId: ids.adminA,
      status: 'IN_PROGRESS',
    },
  });
  await prisma.projectActivity.upsert({
    where: { id: '51000000-0000-4000-8000-000000000099' },
    update: { projectId: ids.hiddenProject, organizationId: ids.orgA },
    create: {
      id: '51000000-0000-4000-8000-000000000099',
      projectId: ids.hiddenProject,
      organizationId: ids.orgA,
      type: 'inspection',
      label: 'Hidden dashboard activity',
      duration: '1h',
      scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'a_faire',
    },
  });
  console.log(JSON.stringify({ status: 'PASS', fixture: 'organization-dashboard', syntheticOnly: true }));
} finally {
  await prisma.$disconnect();
}
