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
const evidenceRoot = assertUnderQaRoot(process.env.CORO_QA_INCIDENT_EVIDENCE || 'D:\\CORO-QA\\tracking\\organization-incident-list');
const adapter = await startMfaCaptureAdapter({ captureDirectory: assertUnderQaRoot(process.env.CORO_QA_MFA_DIR), channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({ apiUrl: process.env.CORO_QA_BACKEND_URL, frontendUrl: process.env.CORO_QA_FRONTEND_URL, portalUrl: process.env.CORO_QA_PORTAL_URL, password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });
const ids = {
  orgA: '10000000-0000-4000-8000-000000000002', orgB: '10000000-0000-4000-8000-000000000003',
  buildingA: '40000000-0000-4000-8000-000000000001', buildingB: '40000000-0000-4000-8000-000000000002',
  managerA: '70000000-0000-4000-8000-000000000004', corporateA: '70000000-0000-4000-8000-000000000007',
  zeroA: '70000000-0000-4000-8000-000000000005', corporateB: '70000000-0000-4000-8000-000000000006',
};
const checks = [];
const check = (id, pass, detail) => checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
const statuses = ['PRE_ALERT', 'ACTIVE', 'CONTAINED', 'RESOLVED', 'CANCELLED'];
const types = ['FIRE_ALERT', 'MEDICAL', 'POWER_OUTAGE'];

async function seed() {
  await prisma.clientUser.updateMany({ where: { id: { in: [ids.managerA, ids.corporateA, ids.zeroA, ids.corporateB] } }, data: { incidentPermissions: ['INCIDENT_READ'], isActive: true } });
  await prisma.incidentEvent.deleteMany({ where: { id: { startsWith: 'incident-list-qa-' } } });
  const base = Date.UTC(2026, 9, 1, 12, 0, 0);
  const rows = Array.from({ length: 137 }, (_, index) => {
    const status = statuses[index % statuses.length];
    return {
      id: `incident-list-qa-a-${String(index).padStart(3, '0')}`, buildingId: ids.buildingA, organizationId: ids.orgA,
      type: types[index % types.length], status, triggeredAt: new Date(base + Math.floor(index / 3) * 60_000),
      triggeredBy: 'Acteur synthétique', description: `Incident synthétique ${index}`,
      occupantsSnapshot: { privateMarker: `occupants-${index}` }, teamSnapshot: { privateMarker: `team-${index}` },
      interventionSheet: { privateMarker: `sheet-${index}` }, procedureCode: index % 3 === 0 ? 'P003' : index % 3 === 1 ? 'P013' : 'P016',
      publicAccessToken: index === 0 ? 'incident-list-sensitive-token' : null,
      isExercise: index % 4 === 0, isActive: !['RESOLVED', 'CANCELLED'].includes(status),
      resolvedAt: status === 'RESOLVED' ? new Date(base + Math.floor(index / 3) * 60_000 + 900_000) : null,
    };
  });
  rows.push(...Array.from({ length: 3 }, (_, index) => ({
    id: `incident-list-qa-b-${String(index).padStart(3, '0')}`, buildingId: ids.buildingB, organizationId: ids.orgB,
    type: 'HAZMAT', status: 'ACTIVE', triggeredAt: new Date(base + index * 60_000), triggeredBy: 'Autre organisation', occupantsSnapshot: {}, teamSnapshot: {},
  })));
  await prisma.incidentEvent.createMany({ data: rows });
  return rows;
}

async function fetchAll(token, query = '') {
  const items = [];
  let page = 1;
  let response;
  do {
    response = await lab.call(`/client-portal/incidents/buildings/${ids.buildingA}/history?page=${page}&pageSize=25${query}`, { token });
    if (response.status !== 200) break;
    items.push(...response.data.items);
    page += 1;
  } while (page <= response.data.pagination.totalPages);
  return { response, items };
}

try {
  const rows = await seed();
  const [manager, corporate, zero, other] = await Promise.all([lab.loginAs('clientLocalA'), lab.loginAs('clientCorporateA'), lab.loginAs('clientWithoutBuildings'), lab.loginAs('clientOrganizationB')]);
  const route = `/client-portal/incidents/buildings/${ids.buildingA}/history?page=1&pageSize=25`;
  const [managerFirst, corporateFirst, zeroList, otherList, anonymous] = await Promise.all([
    lab.call(route, { token: manager.token }), lab.call(route, { token: corporate.token }), lab.call(route, { token: zero.token }), lab.call(route, { token: other.token }), lab.call(route),
  ]);
  const all = await fetchAll(manager.token);
  const combined = await lab.call(`${route}&search=P003&status=OPEN&exercise=EXERCISE&sortBy=type&sortOrder=asc`, { token: manager.token });
  const invalid = await lab.call(`/client-portal/incidents/buildings/${ids.buildingA}/history?pageSize=101`, { token: manager.token });
  const latestId = all.items[0]?.id;
  const ownDetail = await lab.call(`/client-portal/incidents/${latestId}/detail`, { token: manager.token });
  const crossDetail = await lab.call(`/client-portal/incidents/${latestId}/detail`, { token: other.token });
  const idsReturned = all.items.map((item) => item.id);
  const tiedStable = all.items.every((item, index, collection) => index === 0 || new Date(collection[index - 1].triggeredAt) > new Date(item.triggeredAt) || (collection[index - 1].triggeredAt === item.triggeredAt && collection[index - 1].id > item.id));
  const forbiddenFields = ['occupantsSnapshot', 'teamSnapshot', 'interventionSheet', 'publicAccessToken', 'description', 'triggeredBy', 'rexWentWell'];
  const minimal = managerFirst.data?.items?.every((item) => forbiddenFields.every((field) => !(field in item)));

  check('fixture-volume-multiple-pages', rows.filter((row) => row.organizationId === ids.orgA).length === 137, '137 incidents synthétiques');
  check('manager-authorized', managerFirst.status === 200, `HTTP ${managerFirst.status}`);
  check('corporate-authorized', corporateFirst.status === 200, `HTTP ${corporateFirst.status}`);
  check('building-scope-denial', [403, 404].includes(zeroList.status), `HTTP ${zeroList.status}`);
  check('tenant-denial', [403, 404].includes(otherList.status), `HTTP ${otherList.status}`);
  check('anonymous-denial', anonymous.status === 401, `HTTP ${anonymous.status}`);
  check('bounded-parameters', invalid.status === 400, `HTTP ${invalid.status}`);
  check('complete-pagination', all.items.length === 137 && new Set(idsReturned).size === 137, `${all.items.length} reçus, ${new Set(idsReturned).size} uniques`);
  check('stable-tie-order', tiedStable, 'triggeredAt desc puis id desc');
  check('full-scope-counter', managerFirst.data?.counts?.all === 137 && managerFirst.data?.pagination?.total === 137, JSON.stringify(managerFirst.data?.counts));
  check('combined-query', combined.status === 200 && combined.data.items.every((item) => item.procedureCode === 'P003' && item.isExercise && ['PRE_ALERT', 'ACTIVE', 'CONTAINED'].includes(item.status)), `${combined.data?.pagination?.total ?? 0} résultats`);
  check('minimal-contract', minimal, `champs interdits absents=${minimal}`);
  check('pre-alert-and-cancelled-preserved', all.items.some((item) => item.status === 'PRE_ALERT') && all.items.some((item) => item.status === 'CANCELLED'), 'statuts canoniques présents');
  check('exercise-marker', all.items.some((item) => item.isExercise) && all.items.some((item) => !item.isExercise), 'exercices et incidents réels présents');
  check('authorized-direct-detail', ownDetail.status === 200 && ownDetail.data?.id === latestId, `HTTP ${ownDetail.status}`);
  check('cross-tenant-direct-detail', [403, 404].includes(crossDetail.status), `HTTP ${crossDetail.status}`);

  const report = { generatedAt: new Date().toISOString(), sourceHead: process.env.CORO_QA_COMMIT_SHA, productionMutation: false, providers: 'SIMULATED_ONLY', fixture: { organizations: 2, buildingAIncidents: 137, buildingBIncidents: 3 }, checks, observed: { pages: all.response?.data?.pagination?.totalPages, total: all.items.length, unique: new Set(idsReturned).size, zeroStatus: zeroList.status, crossTenantStatus: otherList.status }, verdict: checks.every((item) => item.status === 'PASS') ? 'PASS' : 'FAIL' };
  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(join(evidenceRoot, 'incident-list-api-acceptance.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await adapter.close().catch(() => undefined);
  await prisma.$disconnect();
}
