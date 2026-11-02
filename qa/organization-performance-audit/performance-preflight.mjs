#!/usr/bin/env node
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.includes('127.0.0.1:5596/coro_qa_global_e2e')) throw new Error('Disposable QA database required.');
const root = resolve(import.meta.dirname, '../..');
const require = createRequire(join(root, 'coro-backend', 'package.json'));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
try {
  const [authority, grants, rates, tasks, sessions] = await Promise.all([
    prisma.platformAuthorityConfiguration.findFirst({ select: { status: true } }),
    prisma.platformPermissionGrant.count({ where: { status: 'ACTIVE' } }),
    prisma.advisorInternalCostRate.count({ where: { status: 'APPROVED' } }),
    prisma.projectTask.count({ where: { taskTitle: { startsWith: 'Rendement synthetic task' } } }),
    prisma.refreshToken.count({ where: { userId: { in: ['20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000006','20000000-0000-4000-8000-000000000007'] }, isRevoked: false } }),
  ]);
  console.log(JSON.stringify({ authority: authority?.status ?? 'UNCONFIGURED', activeGrants: grants, approvedRates: rates, auditTasks: tasks, opaqueRefreshSessions: sessions, reusableSessionMaterialAvailable: false }));
} finally { await prisma.$disconnect(); }
