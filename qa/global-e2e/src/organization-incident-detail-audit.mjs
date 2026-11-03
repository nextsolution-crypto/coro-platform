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
const evidenceRoot = assertUnderQaRoot(process.env.CORO_QA_INCIDENT_DETAIL_EVIDENCE || 'D:\\CORO-QA\\tracking\\organization-incident-detail');
const adapter = await startMfaCaptureAdapter({ captureDirectory: assertUnderQaRoot(process.env.CORO_QA_MFA_DIR), channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({ apiUrl: process.env.CORO_QA_BACKEND_URL, frontendUrl: process.env.CORO_QA_FRONTEND_URL, portalUrl: process.env.CORO_QA_PORTAL_URL, password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });
const ids = {
  orgA: '10000000-0000-4000-8000-000000000002', orgB: '10000000-0000-4000-8000-000000000003',
  buildingA: '40000000-0000-4000-8000-000000000001', buildingB: '40000000-0000-4000-8000-000000000002',
  corporateA: '70000000-0000-4000-8000-000000000007', zeroA: '70000000-0000-4000-8000-000000000005', corporateB: '70000000-0000-4000-8000-000000000006',
  active: 'incident-detail-qa-active', resolved: 'incident-detail-qa-resolved', cancelled: 'incident-detail-qa-cancelled', exercise: 'incident-detail-qa-exercise', failure: 'incident-detail-qa-failure', other: 'incident-detail-qa-other',
};
const checks = [];
const check = (id, pass, detail, classification = pass ? 'PASS' : 'DEFECT_REPRODUCED') => checks.push({ id, status: pass ? 'PASS' : 'FAIL', classification, detail });
const incident = (id, organizationId, buildingId, status, extra = {}) => ({ id, organizationId, buildingId, type: 'FIRE_ALERT', status, triggeredAt: new Date('2026-11-02T14:00:00.000Z'), triggeredBy: 'Acteur synthétique', description: '<img src=x onerror="globalThis.__qaXss=1"> Texte long accentué — décision QA', occupantsSnapshot: { privateMarker: `${id}-occupants` }, teamSnapshot: { privateMarker: `${id}-team` }, interventionSheet: { privateMarker: `${id}-sheet` }, procedureCode: 'P003', publicAccessToken: `${id}-secret-token`, isActive: !['RESOLVED', 'CANCELLED'].includes(status), containedAt: status === 'CONTAINED' ? new Date('2026-11-02T14:10:00.000Z') : null, resolvedAt: status === 'RESOLVED' ? new Date('2026-11-02T14:20:00.000Z') : null, ...extra });

async function seed() {
  await prisma.incidentAuditEvent.deleteMany({ where: { incidentEventId: { startsWith: 'incident-detail-qa-' } } });
  await prisma.incidentAuthorityAssignment.deleteMany({ where: { incidentEventId: { startsWith: 'incident-detail-qa-' } } });
  await prisma.incidentEvent.deleteMany({ where: { id: { startsWith: 'incident-detail-qa-' } } });
  await prisma.clientUser.updateMany({ where: { id: { in: [ids.corporateA, ids.zeroA, ids.corporateB] } }, data: { isActive: true, incidentPermissions: ['INCIDENT_READ', 'INCIDENT_TASK_PARTICIPATE', 'INCIDENT_SUPERVISE', 'INCIDENT_COMMAND'] } });
  await prisma.incidentEvent.createMany({ data: [incident(ids.active, ids.orgA, ids.buildingA, 'ACTIVE'), incident(ids.resolved, ids.orgA, ids.buildingA, 'RESOLVED'), incident(ids.cancelled, ids.orgA, ids.buildingA, 'CANCELLED'), incident(ids.exercise, ids.orgA, ids.buildingA, 'ACTIVE', { isExercise: true }), incident(ids.failure, ids.orgA, ids.buildingA, 'ACTIVE'), incident(ids.other, ids.orgB, ids.buildingB, 'ACTIVE')] });
  await prisma.incidentTask.create({ data: { incidentEventId: ids.active, role: 'COORDINATOR', title: 'Vérifier la zone nord', description: 'Tâche synthétique longue', stepOrder: 1 } });
  await prisma.incidentLog.createMany({ data: [
    { incidentEventId: ids.active, timestamp: new Date('2026-11-02T14:01:00.000Z'), action: 'Observation synthétique', actor: 'Système QA', details: 'Chronologie initiale', isAutomatic: true },
    { incidentEventId: ids.active, timestamp: new Date('2026-11-02T14:01:00.000Z'), action: 'Même horodatage', actor: 'Système QA', details: 'Départage à vérifier', isAutomatic: true },
  ] });
  await prisma.incidentAuthorityAssignment.createMany({ data: [ids.active, ids.exercise, ids.failure].map((incidentEventId) => ({ organizationId: ids.orgA, buildingId: ids.buildingA, incidentEventId, subjectType: 'CLIENT_USER', subjectId: ids.corporateA, operationalRole: 'QA_COMMANDER', permissions: ['INCIDENT_READ', 'INCIDENT_TASK_PARTICIPATE', 'INCIDENT_SUPERVISE', 'INCIDENT_COMMAND'], grantedByType: 'SYSTEM', grantedById: 'qa-fixture', grantReason: 'Synthetic incident detail acceptance' })) });
}

try {
  await seed();
  const actor = await lab.loginAs('clientCorporateA');
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 1200));
  const zero = await lab.loginAs('clientWithoutBuildings');
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 1200));
  const other = await lab.loginAs('clientOrganizationB');
  const detailPath = `/client-portal/incidents/${ids.active}/detail`;
  const [detail, zeroDetail, crossDetail, anonymous] = await Promise.all([lab.call(detailPath, { token: actor.token }), lab.call(detailPath, { token: zero.token }), lab.call(detailPath, { token: other.token }), lab.call(detailPath)]);
  check('authorized-detail', detail.status === 200 && detail.data?.id === ids.active, `HTTP ${detail.status}`);
  check('building-scope-denial', [403, 404].includes(zeroDetail.status), `HTTP ${zeroDetail.status}`);
  check('tenant-denial', [403, 404].includes(crossDetail.status), `HTTP ${crossDetail.status}`);
  check('anonymous-denial', anonymous.status === 401, `HTTP ${anonymous.status}`);
  const forbidden = ['interventionSheet', 'publicAccessToken'].filter((field) => field in (detail.data || {}));
  const occupantsMinimized = Array.isArray(detail.data?.occupantsSnapshot) && detail.data.occupantsSnapshot.every((entry) => Object.keys(entry).length === 0);
  const teamMinimized = Array.isArray(detail.data?.teamSnapshot) && detail.data.teamSnapshot.every((entry) => !('email' in entry) && !('phone' in entry));
  check('detail-minimal-projection', forbidden.length === 0 && occupantsMinimized && teamMinimized, `Interdits=${forbidden.join(', ') || 'aucun'}; occupantsMinimises=${occupantsMinimized}; equipeMinimisee=${teamMinimized}`);

  const spoof = await lab.call(`/client-portal/incidents/${ids.active}/logs`, { token: actor.token, method: 'POST', body: { action: 'Décision QA', actor: 'Présidente usurpée', details: '<script>globalThis.__qaLogXss=1</script>' } });
  const storedSpoof = await prisma.incidentLog.findFirst({ where: { incidentEventId: ids.active, action: 'Décision QA' }, orderBy: { timestamp: 'desc' } });
  check('server-owned-log-author', spoof.status === 201 && storedSpoof?.actor === `CLIENT_USER:${ids.corporateA}`, `HTTP ${spoof.status}; acteur persiste=${storedSpoof?.actor ?? 'aucun'}`);

  const crossSubresource = await lab.call(`/client-portal/incidents/${ids.other}/logs`, { token: actor.token, method: 'POST', body: { action: 'Interdit' } });
  const crossSubresourceWrite = await prisma.incidentLog.count({ where: { incidentEventId: ids.other, action: 'Interdit' } });
  check('cross-incident-subresource-denial', [403, 404].includes(crossSubresource.status) && crossSubresourceWrite === 0, `HTTP ${crossSubresource.status}; ecritures=${crossSubresourceWrite}`);

  const [firstContain, secondContain] = await Promise.all([
    lab.call(`/client-portal/incidents/${ids.active}/contain`, { token: actor.token, method: 'PUT', body: { lockVersion: 0 } }),
    lab.call(`/client-portal/incidents/${ids.active}/contain`, { token: actor.token, method: 'PUT', body: { lockVersion: 0 } }),
  ]);
  const containLogs = await prisma.incidentLog.count({ where: { incidentEventId: ids.active, action: 'Incident contenu' } });
  check('contain-idempotency', firstContain.status === 200 && secondContain.status === 200 && containLogs === 1, `HTTP ${firstContain.status}/${secondContain.status}; journaux=${containLogs}`);

  const resolveNoReason = await lab.call(`/client-portal/incidents/${ids.active}/resolve`, { token: actor.token, method: 'PUT', body: {} });
  const resolved = await prisma.incidentEvent.findUnique({ where: { id: ids.active }, select: { status: true, closingNotes: true, isActive: true } });
  check('resolution-reason-required', resolveNoReason.status >= 400 && resolved?.status === 'CONTAINED', `HTTP ${resolveNoReason.status}; état=${resolved?.status}; motif=${resolved?.closingNotes ?? 'absent'}`);

  const resolutionReason = 'Résolution synthétique autorisée';
  const firstResolve = await lab.call(`/client-portal/incidents/${ids.active}/resolve`, { token: actor.token, method: 'PUT', body: { closingNotes: resolutionReason } });
  const replayResolve = await lab.call(`/client-portal/incidents/${ids.active}/resolve`, { token: actor.token, method: 'PUT', body: { closingNotes: resolutionReason } });
  const resolutionState = await prisma.incidentEvent.findUnique({ where: { id: ids.active }, select: { status: true, closingNotes: true, isActive: true } });
  const resolutionLogs = await prisma.incidentLog.count({ where: { incidentEventId: ids.active, action: 'Incident résolu' } });
  const resolutionAudits = await prisma.incidentAuditEvent.count({ where: { incidentEventId: ids.active, operation: 'INCIDENT_RESOLVED' } });
  check('authorized-resolution-audit-and-replay', firstResolve.status === 200 && replayResolve.status === 200 && resolutionState?.status === 'RESOLVED' && resolutionState.closingNotes === resolutionReason && resolutionLogs === 1 && resolutionAudits === 1, `HTTP ${firstResolve.status}/${replayResolve.status}; journaux=${resolutionLogs}; audits=${resolutionAudits}`);

  await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION qa_fail_incident_resolution_log() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."incidentEventId" = '${ids.failure}' AND NEW."action" = 'Incident résolu' THEN RAISE EXCEPTION 'QA injected log failure'; END IF; RETURN NEW; END $$`);
  await prisma.$executeRawUnsafe('CREATE TRIGGER qa_fail_incident_resolution_log_trigger BEFORE INSERT ON "IncidentLog" FOR EACH ROW EXECUTE FUNCTION qa_fail_incident_resolution_log()');
  let failedResolve;
  try {
    failedResolve = await lab.call(`/client-portal/incidents/${ids.failure}/resolve`, { token: actor.token, method: 'PUT', body: { closingNotes: 'Doit être annulée' } });
  } finally {
    await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS qa_fail_incident_resolution_log_trigger ON "IncidentLog"');
    await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS qa_fail_incident_resolution_log()');
  }
  const rollbackState = await prisma.incidentEvent.findUnique({ where: { id: ids.failure }, select: { status: true, closingNotes: true, isActive: true } });
  const rollbackLogs = await prisma.incidentLog.count({ where: { incidentEventId: ids.failure } });
  const rollbackAudits = await prisma.incidentAuditEvent.count({ where: { incidentEventId: ids.failure } });
  check('sql-failure-transaction-rollback', failedResolve.status >= 500 && rollbackState?.status === 'ACTIVE' && rollbackState.closingNotes === null && rollbackState.isActive && rollbackLogs === 0 && rollbackAudits === 0, `HTTP ${failedResolve.status}; etat=${rollbackState?.status}; journaux=${rollbackLogs}; audits=${rollbackAudits}`);

  await prisma.incidentEvent.update({ where: { id: ids.exercise }, data: { status: 'ACTIVE', isActive: true } });
  const clientDate = '2001-01-01T00:00:00.000Z';
  const rex = await lab.call(`/client-portal/incidents/${ids.exercise}/rex`, { token: actor.token, method: 'PUT', body: { rexWentWell: 'QA', rexCompletedAt: clientDate } });
  const rexStored = await prisma.incidentEvent.findUnique({ where: { id: ids.exercise }, select: { rexCompletedAt: true } });
  check('server-owned-rex-date', rex.status >= 400 || rexStored?.rexCompletedAt?.toISOString() !== clientDate, `HTTP ${rex.status}; date persistée=${rexStored?.rexCompletedAt?.toISOString()}`);

  const tied = (detail.data?.logs || []).filter((entry) => new Date(entry.timestamp).toISOString() === '2026-11-02T14:01:00.000Z');
  const sortedIds = tied.map((entry) => entry.id);
  const deterministic = JSON.stringify(sortedIds) === JSON.stringify([...sortedIds].sort());
  check('timeline-deterministic-tie-break', tied.length === 2 && deterministic, `${tied.length} evenements lies; ordre=${sortedIds.join(',')}`);

  const report = { generatedAt: new Date().toISOString(), sourceHead: process.env.CORO_QA_COMMIT_SHA, environment: { postgresql: 16, migrations: 167, migrationHead: '20261120010000_permanent_qr_codes', network: 'deny-by-default', providers: 'SIMULATED_ONLY' }, checks, counts: { pass: checks.filter((x) => x.status === 'PASS').length, fail: checks.filter((x) => x.status === 'FAIL').length }, verdict: checks.some((x) => x.status === 'FAIL') ? 'CORRECTION_REQUIRED' : 'PASS' };
  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(join(evidenceRoot, 'incident-detail-api-postgresql.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await adapter.close().catch(() => undefined);
  await prisma.$disconnect();
}
