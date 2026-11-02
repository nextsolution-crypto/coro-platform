#!/usr/bin/env node
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { QaIdentityLab } from './browser-orchestration.mjs';
import { loadSecretStore } from './secret-store.mjs';
import { startMfaCaptureAdapter } from './mfa-capture-adapter.mjs';
import { assertUnderQaRoot } from './policy.mjs';

const root = resolve(import.meta.dirname, '../../..');
const require = createRequire(join(root, 'coro-backend', 'package.json'));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const secrets = await loadSecretStore();
const evidenceRoot = assertUnderQaRoot(
  process.env.CORO_QA_INCIDENT_EVIDENCE || 'D:\\CORO-QA\\tracking\\organization-incident-list',
);
const adapter = await startMfaCaptureAdapter({
  captureDirectory: assertUnderQaRoot(process.env.CORO_QA_MFA_DIR),
  channelToken: secrets.mfaChannelToken,
});
const lab = new QaIdentityLab({
  apiUrl: process.env.CORO_QA_BACKEND_URL,
  frontendUrl: process.env.CORO_QA_FRONTEND_URL,
  portalUrl: process.env.CORO_QA_PORTAL_URL,
  password: secrets.syntheticPassword,
  mfaAdapterUrl: adapter.url,
  mfaChannelToken: secrets.mfaChannelToken,
});

const ids = {
  orgA: '10000000-0000-4000-8000-000000000002',
  orgB: '10000000-0000-4000-8000-000000000003',
  buildingA: '40000000-0000-4000-8000-000000000001',
  buildingB: '40000000-0000-4000-8000-000000000002',
  managerA: '70000000-0000-4000-8000-000000000001',
  localA: '70000000-0000-4000-8000-000000000004',
  corporateA: '70000000-0000-4000-8000-000000000007',
  zeroA: '70000000-0000-4000-8000-000000000005',
  corporateB: '70000000-0000-4000-8000-000000000006',
};
const checks = [];
const check = (id, pass, detail) => checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });

async function seed() {
  await prisma.clientUser.updateMany({
    where: { id: { in: [ids.managerA, ids.localA, ids.corporateA, ids.zeroA, ids.corporateB] } },
    data: { incidentPermissions: ['INCIDENT_READ'], isActive: true },
  });
  await prisma.incidentEvent.deleteMany({
    where: { id: { startsWith: 'incident-list-qa-' } },
  });
  const base = Date.UTC(2026, 9, 1, 12, 0, 0);
  const rows = [];
  for (let index = 0; index < 62; index += 1) {
    rows.push({
      id: `incident-list-qa-a-${String(index).padStart(3, '0')}`,
      buildingId: ids.buildingA,
      organizationId: ids.orgA,
      type: index % 3 === 0 ? 'FIRE_ALERT' : index % 3 === 1 ? 'MEDICAL' : 'POWER_OUTAGE',
      status: index % 4 === 0 ? 'ACTIVE' : index % 4 === 1 ? 'CONTAINED' : 'RESOLVED',
      triggeredAt: new Date(base + index * 60_000),
      triggeredBy: index === 0 ? 'Équipe synthétique — titre très long pour la lisibilité' : 'Acteur QA',
      description: index === 2 ? null : `Incident synthétique ${index}`,
      occupantsSnapshot: {},
      teamSnapshot: {},
      isExercise: index % 5 === 0,
      isActive: index % 4 !== 2,
      resolvedAt: index % 4 >= 2 ? new Date(base + index * 60_000 + 900_000) : null,
    });
  }
  for (let index = 0; index < 3; index += 1) {
    rows.push({
      id: `incident-list-qa-b-${String(index).padStart(3, '0')}`,
      buildingId: ids.buildingB,
      organizationId: ids.orgB,
      type: 'HAZMAT',
      status: 'ACTIVE',
      triggeredAt: new Date(base + index * 60_000),
      triggeredBy: 'Autre organisation',
      occupantsSnapshot: {},
      teamSnapshot: {},
    });
  }
  await prisma.incidentEvent.createMany({ data: rows });
  return rows;
}

try {
  const rows = await seed();
  const [manager, corporate, zero, other] = await Promise.all([
    lab.loginAs('clientLocalA'),
    lab.loginAs('clientCorporateA'),
    lab.loginAs('clientWithoutBuildings'),
    lab.loginAs('clientOrganizationB'),
  ]);
  const route = `/client-portal/incidents/buildings/${ids.buildingA}/history`;
  const managerList = await lab.call(route, { token: manager.token });
  const corporateList = await lab.call(route, { token: corporate.token });
  const zeroList = await lab.call(route, { token: zero.token });
  const otherList = await lab.call(route, { token: other.token });
  const anonymous = await lab.call(route);
  const latestId = 'incident-list-qa-a-061';
  const ownDetail = await lab.call(`/client-portal/incidents/${latestId}/detail`, { token: manager.token });
  const crossDetail = await lab.call(`/client-portal/incidents/${latestId}/detail`, { token: other.token });

  check('fixture-volume', rows.filter((row) => row.organizationId === ids.orgA).length === 62, '62 incidents synthétiques dans le bâtiment A');
  check('manager-authorized-list', managerList.status === 200, `HTTP ${managerList.status}`);
  check('corporate-authorized-list', corporateList.status === 200, `HTTP ${corporateList.status}`);
  check('building-scope-denial', [403, 404].includes(zeroList.status), `HTTP ${zeroList.status}`);
  check('tenant-denial', [403, 404].includes(otherList.status), `HTTP ${otherList.status}`);
  check('anonymous-denial', anonymous.status === 401, `HTTP ${anonymous.status}`);
  check('authorized-direct-detail', ownDetail.status === 200 && ownDetail.data?.id === latestId, `HTTP ${ownDetail.status}`);
  check('cross-tenant-direct-detail', [403, 404].includes(crossDetail.status), `HTTP ${crossDetail.status}`);
  check('descending-order', managerList.data?.[0]?.id === latestId, `premier=${managerList.data?.[0]?.id ?? 'absent'}`);
  check('complete-volume', Array.isArray(managerList.data) && managerList.data.length === 62, `reçus=${Array.isArray(managerList.data) ? managerList.data.length : 'non-tableau'}, attendus=62`);
  check('exercise-marker-in-contract', managerList.data?.some?.((item) => item.isExercise === true), 'isExercise présent dans la réponse API');

  const report = {
    generatedAt: new Date().toISOString(),
    sourceHead: process.env.CORO_QA_COMMIT_SHA,
    productionMutation: false,
    providers: 'SIMULATED_ONLY',
    fixture: { organizations: 2, buildingAIncidents: 62, buildingBIncidents: 3 },
    checks,
    observed: {
      managerListCount: Array.isArray(managerList.data) ? managerList.data.length : null,
      corporateListCount: Array.isArray(corporateList.data) ? corporateList.data.length : null,
      zeroStatus: zeroList.status,
      crossTenantStatus: otherList.status,
      anonymousStatus: anonymous.status,
    },
    verdict: checks.every((item) => item.status === 'PASS') ? 'PASS' : 'FAIL',
  };
  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(join(evidenceRoot, 'incident-list-api-acceptance.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await adapter.close().catch(() => undefined);
  await prisma.$disconnect();
}
