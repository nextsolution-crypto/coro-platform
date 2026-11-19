'use strict';

const crypto = require('node:crypto');
const manifest = require('./coro-demo-report-03-manifest.json');

const MODES = new Set(['preflight', 'provision', 'verify', 'rollback']);
const fingerprint = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const normalize = (value) => String(value ?? '').normalize('NFKD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase().replace(/\s+/g, ' ');
const fixtureWhere = (key) => ({ organizationId_fixtureNamespace_fixtureKey: { organizationId: manifest.organizationId, fixtureNamespace: manifest.fixtureNamespace, fixtureKey: key } });

async function resolveTarget(tx) {
  const organization = await tx.organization.findUnique({
    where: { id: manifest.organizationId },
    select: { id: true, name: true, isActive: true, commercialRelationship: true, demoEnvironment: { select: { status: true, communicationMode: true, externalProvidersDisabled: true } } },
  });
  if (!organization || normalize(organization.name) !== normalize(manifest.organizationName) || !organization.isActive || organization.demoEnvironment?.status !== 'ACTIVE' || organization.demoEnvironment?.communicationMode !== 'SIMULATE' || organization.demoEnvironment?.externalProvidersDisabled !== true) throw new Error('DEMO_TENANT_NOT_ADMISSIBLE');
  if (organization.commercialRelationship === 'INTERNAL') throw new Error('TRIAL_NOT_ALLOWED_FOR_INTERNAL_ORGANIZATION');
  const clientRows = await tx.client.findMany({ where: { organizationId: manifest.organizationId, isActive: true }, select: { id: true, name: true } });
  const clients = clientRows.filter((row) => normalize(row.name) === normalize(manifest.clientName));
  if (clients.length !== 1) throw new Error('CLIENT_CARDINALITY_INVALID');
  const buildingRows = await tx.building.findMany({ where: { organizationId: manifest.organizationId, clientId: clients[0].id, isActive: true }, select: { id: true, name: true } });
  const buildings = buildingRows.filter((row) => normalize(row.name) === normalize(manifest.buildingName));
  if (buildings.length !== 1 || fingerprint(buildings[0].id) !== manifest.buildingFingerprint) throw new Error('BUILDING_CANONICAL_ID_MISMATCH');
  const identities = {};
  for (const [profile, expected] of Object.entries(manifest.identities)) {
    const row = await tx.clientUser.findUnique({ where: { email: expected.email }, select: { id: true, email: true, organizationId: true, clientId: true, role: true, isActive: true, operationalPermissions: true } });
    if (!row || !row.isActive || row.organizationId !== organization.id || row.clientId !== clients[0].id || row.role !== expected.role) throw new Error(`IDENTITY_${profile.toUpperCase()}_NOT_ADMISSIBLE`);
    identities[profile] = row;
  }
  if (identities.agent.id === identities.supervisor.id) throw new Error('IDENTITIES_NOT_DISTINCT');
  const actor = await tx.user.findUnique({ where: { email: 'demo@getcoro.io' }, select: { id: true, organizationId: true, isActive: true, role: true } });
  if (!actor || !actor.isActive || actor.organizationId !== organization.id || !['ADMIN', 'SUPER_ADMIN'].includes(actor.role)) throw new Error('GOVERNED_ACTOR_NOT_ADMISSIBLE');
  const capability = await tx.commercialCapability.findUnique({ where: { code: manifest.capability }, include: { scopePolicies: true } });
  if (!capability || !capability.isAvailable || capability.lifecycle !== 'CURRENT' || !capability.scopePolicies.some((row) => row.scope === 'SITE' && row.status === 'ALLOWED')) throw new Error('CAPABILITY_NOT_SITE_READY');
  return { organization, client: clients[0], building: buildings[0], identities, actor, capability };
}

async function assertGlobalSafety(tx, environment) {
  const flags = ['INCIDENT_REPORTS_ENABLED', 'OPERATIONAL_LOG_ENABLED', 'OPERATIONAL_SHIFTS_ENABLED', 'OPERATIONAL_DIRECTIVES_ENABLED', 'OPERATIONAL_FOLLOWUPS_ENABLED'];
  if (!flags.every((name) => environment[name] !== 'true')) throw new Error('FEATURE_FLAGS_MUST_BE_DISABLED_BEFORE_PROVISION');
  const other = await tx.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "CapabilityEntitlement" e JOIN "CommercialCapability" c ON c.id=e."capabilityId" JOIN LATERAL (SELECT lifecycle,enabled,"effectiveFrom","effectiveUntil" FROM "CapabilityEntitlementRevision" r WHERE r."entitlementId"=e.id ORDER BY "versionNumber" DESC LIMIT 1) x ON true WHERE e."organizationId" <> '${manifest.organizationId}' AND c.code::text='INCIDENT_REPORTS' AND x.lifecycle='GRANTED' AND x.enabled=true AND x."effectiveFrom"<=now() AND (x."effectiveUntil" IS NULL OR x."effectiveUntil">now())`);
  if (Number(other[0]?.count ?? 0) !== 0) throw new Error('CROSS_TENANT_REPORT_ENTITLEMENT_ACTIVE');
}

async function register(tx, key, entityType, entityId, baseline) {
  const existing = await tx.demoFixtureRecord.findUnique({ where: fixtureWhere(key) });
  if (existing && (existing.entityType !== entityType || existing.entityId !== entityId)) throw new Error('FIXTURE_COLLISION');
  return tx.demoFixtureRecord.upsert({ where: fixtureWhere(key), create: { organizationId: manifest.organizationId, fixtureNamespace: manifest.fixtureNamespace, fixtureKey: key, entityType, entityId, state: 'ACTIVE', baseline }, update: { state: 'ACTIVE' } });
}

async function currentState(tx, target) {
  const assignmentCount = await tx.clientOperationalBuildingAssignment.count({ where: { organizationId: manifest.organizationId, buildingId: target.building.id, clientUserId: { in: [target.identities.agent.id, target.identities.supervisor.id] }, status: 'ACTIVE' } });
  const authorityCount = await tx.incidentAuthorityAssignment.count({ where: { organizationId: manifest.organizationId, buildingId: target.building.id, subjectType: 'CLIENT_USER', subjectId: { in: [target.identities.agent.id, target.identities.supervisor.id] }, status: 'ACTIVE', permissions: { has: 'INCIDENT_READ' } } });
  const entitlement = await tx.capabilityEntitlement.findFirst({ where: { organizationId: manifest.organizationId, capabilityId: target.capability.id, scope: 'SITE', clientId: target.client.id, buildingId: target.building.id }, include: { revisions: { orderBy: { versionNumber: 'desc' }, take: 1 } } });
  const template = await tx.incidentReportTemplateVersion.findFirst({ where: { organizationId: manifest.organizationId, templateKey: manifest.templateKey, status: 'PUBLISHED' }, orderBy: { version: 'desc' } });
  const retentionPolicy = await tx.incidentReportRetentionPolicy.findUnique({ where: { organizationId_reportType: { organizationId: manifest.organizationId, reportType: manifest.reportType } } });
  return { assignmentCount, authorityCount, entitlement, template, retentionPolicy };
}

function sanitized(mode, target, state, mutation) {
  const latest = state.entitlement?.revisions?.[0];
  return { schemaVersion: 1, execution: 'PASS', mode, mutation, organizationFingerprint: fingerprint(target.organization.id), clientFingerprint: fingerprint(target.client.id), buildingFingerprint: fingerprint(target.building.id), identities: Object.fromEntries(Object.entries(target.identities).map(([key, value]) => [key, { fingerprint: fingerprint(value.id), role: value.role, active: value.isActive }])), assignmentCount: state.assignmentCount, authorityCount: state.authorityCount, entitlement: state.entitlement ? { fingerprint: fingerprint(state.entitlement.id), scope: state.entitlement.scope, source: state.entitlement.source, enabled: latest?.enabled, lifecycle: latest?.lifecycle, effectiveUntil: latest?.effectiveUntil } : null, template: state.template ? { fingerprint: fingerprint(state.template.id), status: state.template.status, version: state.template.version } : null, retentionPolicy: state.retentionPolicy ? { fingerprint: fingerprint(state.retentionPolicy.id), active: state.retentionPolicy.isActive, reportTypeMatches: state.retentionPolicy.reportType === manifest.reportType } : null };
}

async function preflight(prisma, environment) {
  return prisma.$transaction(async (tx) => { await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY'); const target = await resolveTarget(tx); await assertGlobalSafety(tx, environment); return sanitized('preflight', target, await currentState(tx, target), false); }, { timeout: 60_000 });
}

async function provision(prisma, environment, runId) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`coro-demo-report-03:${manifest.organizationId}`}, 0))`;
    const target = await resolveTarget(tx); await assertGlobalSafety(tx, environment);
    const before = await currentState(tx, target);
    if (before.entitlement && !(await tx.demoFixtureRecord.findUnique({ where: fixtureWhere('entitlement') }))) throw new Error('PREEXISTING_ENTITLEMENT_NOT_OWNED');
    const now = new Date(); const until = new Date(now.getTime() + manifest.durationDays * 86400000);
    for (const [profile, identity] of Object.entries(target.identities)) {
      const expected = manifest.identities[profile];
      const permissionRecord = await tx.demoFixtureRecord.findUnique({ where: fixtureWhere(`permissions-${profile}`) });
      if (!permissionRecord && identity.operationalPermissions.length !== 0) throw new Error(`PREEXISTING_PERMISSIONS_${profile.toUpperCase()}_NOT_OWNED`);
      const existingAssignment = await tx.clientOperationalBuildingAssignment.findUnique({ where: { organizationId_buildingId_clientUserId: { organizationId: manifest.organizationId, buildingId: target.building.id, clientUserId: identity.id } } });
      const assignmentRecord = await tx.demoFixtureRecord.findUnique({ where: fixtureWhere(`assignment-${profile}`) });
      if (existingAssignment && assignmentRecord?.entityId !== existingAssignment.id) throw new Error(`PREEXISTING_ASSIGNMENT_${profile.toUpperCase()}_NOT_OWNED`);
      const authorityRecord = await tx.demoFixtureRecord.findUnique({ where: fixtureWhere(`authority-${profile}`) });
      const activeAuthorities = await tx.incidentAuthorityAssignment.findMany({ where: { organizationId: manifest.organizationId, buildingId: target.building.id, subjectType: 'CLIENT_USER', subjectId: identity.id, status: 'ACTIVE' }, select: { id: true } });
      if (activeAuthorities.some((row) => row.id !== authorityRecord?.entityId)) throw new Error(`PREEXISTING_AUTHORITY_${profile.toUpperCase()}_NOT_OWNED`);
      await register(tx, `permissions-${profile}`, 'CLIENT_USER_REPORT_PROFILE', identity.id, { operationalPermissions: identity.operationalPermissions });
      await tx.clientUser.update({ where: { id: identity.id }, data: { operationalPermissions: expected.permissions } });
      const assignment = await tx.clientOperationalBuildingAssignment.upsert({ where: { organizationId_buildingId_clientUserId: { organizationId: manifest.organizationId, buildingId: target.building.id, clientUserId: identity.id } }, create: { organizationId: manifest.organizationId, buildingId: target.building.id, clientUserId: identity.id, status: 'ACTIVE', effectiveFrom: now, effectiveUntil: until, grantedByUserId: target.actor.id, grantReason: 'CORO-DEMO-REPORT-03 controlled browser acceptance' }, update: { status: 'ACTIVE', effectiveFrom: now, effectiveUntil: until, revokedAt: null, revokedByUserId: null, revocationReason: null, lockVersion: { increment: 1 } } });
      await register(tx, `assignment-${profile}`, 'CLIENT_OPERATIONAL_ASSIGNMENT', assignment.id, { reversible: true });
      const authorityKey = `coro-demo-report-03-${profile}`;
      const existingAuthority = await tx.incidentAuthorityAssignment.findUnique({ where: { organizationId_idempotencyKey: { organizationId: manifest.organizationId, idempotencyKey: authorityKey } } });
      const authority = existingAuthority ? await tx.incidentAuthorityAssignment.update({ where: { id: existingAuthority.id }, data: { status: 'ACTIVE', permissions: ['INCIDENT_READ'], revokedAt: null, revokedByType: null, revokedById: null, revocationReason: null, lockVersion: { increment: 1 } } }) : await tx.incidentAuthorityAssignment.create({ data: { organizationId: manifest.organizationId, buildingId: target.building.id, subjectType: 'CLIENT_USER', subjectId: identity.id, operationalRole: profile === 'agent' ? 'REPORT_AGENT' : 'REPORT_SUPERVISOR', permissions: ['INCIDENT_READ'], status: 'ACTIVE', grantedByType: 'USER', grantedById: target.actor.id, grantReason: 'CORO-DEMO-REPORT-03 controlled browser acceptance', idempotencyKey: authorityKey, payloadHash: fingerprint(`${manifest.organizationId}:${target.building.id}:${identity.id}:INCIDENT_READ`) } });
      await register(tx, `authority-${profile}`, 'INCIDENT_AUTHORITY_ASSIGNMENT', authority.id, { reversible: true });
    }
    let entitlementRecord = await tx.demoFixtureRecord.findUnique({ where: fixtureWhere('entitlement') });
    let entitlement;
    if (entitlementRecord) entitlement = await tx.capabilityEntitlement.findUnique({ where: { id: entitlementRecord.entityId }, include: { revisions: { orderBy: { versionNumber: 'desc' }, take: 1 } } });
    if (!entitlement) {
      entitlement = await tx.capabilityEntitlement.create({ data: { organizationId: manifest.organizationId, capabilityId: target.capability.id, scope: 'SITE', clientId: target.client.id, buildingId: target.building.id, source: 'TRIAL', provenanceReason: 'CORO-DEMO-REPORT-03 temporary controlled demo', createdByUserId: target.actor.id, createdByDisplayName: 'CORO Demo governed activation', revisions: { create: { versionNumber: 1, lifecycle: 'GRANTED', enabled: true, distributable: false, decisionAt: now, effectiveFrom: now, effectiveUntil: until, reason: 'CORO-DEMO-REPORT-03 temporary controlled demo', createdByUserId: target.actor.id, createdByDisplayName: 'CORO Demo governed activation' } } }, include: { revisions: { orderBy: { versionNumber: 'desc' }, take: 1 } } });
      await register(tx, 'entitlement', 'CAPABILITY_ENTITLEMENT', entitlement.id, { reversible: true });
    }
    const formSchema = { schemaVersion: '1.0', sections: [{ key: 'event', title: 'Événement', fields: [{ key: 'occurredAt', label: 'Date et heure', type: 'DATETIME', required: true, source: 'CORO' }, { key: 'location', label: 'Emplacement', type: 'ROOM', required: true, source: 'CORO' }, { key: 'summary', label: 'Résumé', type: 'LONG_TEXT', required: true, source: 'CORO' }, { key: 'actions', label: 'Mesures prises', type: 'LONG_TEXT', required: true, source: 'CORO' }] }] };
    const fieldCatalog = { occurredAt: { provenance: 'CORO_DEMO' }, location: { provenance: 'CORO_DEMO' }, summary: { provenance: 'CORO_DEMO' }, actions: { provenance: 'CORO_DEMO' } };
    const contentHash = fingerprint(JSON.stringify({ formSchema, fieldCatalog, mappingMetadata: null }));
    let template = await tx.incidentReportTemplateVersion.findFirst({ where: { organizationId: manifest.organizationId, templateKey: manifest.templateKey, contentHash } });
    if (!template) template = await tx.incidentReportTemplateVersion.create({ data: { organizationId: manifest.organizationId, templateKey: manifest.templateKey, version: 1, name: 'Rapport incident — gestion immobilière (Démo)', reportType: manifest.reportType, status: 'PUBLISHED', schemaVersion: '1.0', formSchema, fieldCatalog, contentHash, publishedAt: now, createdByActorType: 'USER', createdByActorId: target.actor.id } });
    else if (template.status !== 'PUBLISHED') template = await tx.incidentReportTemplateVersion.update({ where: { id: template.id }, data: { status: 'PUBLISHED', publishedAt: now, retiredAt: null } });
    await register(tx, 'template', 'INCIDENT_REPORT_TEMPLATE', template.id, { reversible: true });
    let policy = await tx.incidentReportRetentionPolicy.findUnique({ where: { organizationId_reportType: { organizationId: manifest.organizationId, reportType: manifest.reportType } } });
    if (!policy) policy = await tx.incidentReportRetentionPolicy.create({ data: { organizationId: manifest.organizationId, reportType: manifest.reportType, retainForDays: 365, attachmentRetainDays: 365, isActive: true, createdByActorType: 'USER', createdByActorId: target.actor.id } });
    else if (!policy.isActive) {
      const ownedPolicy = await tx.demoFixtureRecord.findUnique({ where: fixtureWhere('retention-policy') });
      if (ownedPolicy?.entityId !== policy.id) throw new Error('INACTIVE_RETENTION_POLICY_NOT_OWNED');
      policy = await tx.incidentReportRetentionPolicy.update({ where: { id: policy.id }, data: { isActive: true } });
    }
    await register(tx, 'retention-policy', 'INCIDENT_REPORT_RETENTION_POLICY', policy.id, { reversible: true });
    await tx.adminAuditEvent.create({ data: { actorType: 'INTERNAL_USER', actorUserId: target.actor.id, actorDisplayName: 'CORO Demo governed activation', actorRole: target.actor.role, action: 'CORO_DEMO_REPORT_03_PROVISIONED', targetType: 'Organization', targetId: manifest.organizationId, organizationId: manifest.organizationId, reason: 'Explicit owner authorization CORO-DEMO-REPORT-03', requestId: String(runId), afterData: { buildingFingerprint: manifest.buildingFingerprint, profileCount: 2, entitlementScope: 'SITE', durationDays: manifest.durationDays } } });
    return sanitized('provision', target, await currentState(tx, target), true);
  }, { isolationLevel: 'Serializable', timeout: 60_000 });
}

async function verify(prisma) {
  return prisma.$transaction(async (tx) => { await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY'); const target = await resolveTarget(tx); const state = await currentState(tx, target); const latest = state.entitlement?.revisions?.[0]; const templateSections = Array.isArray(state.template?.formSchema?.sections) ? state.template.formSchema.sections : []; if (state.assignmentCount !== 2 || state.authorityCount !== 2 || !state.entitlement || state.entitlement.scope !== 'SITE' || state.entitlement.source !== 'TRIAL' || latest?.lifecycle !== 'GRANTED' || latest?.enabled !== true || latest?.distributable !== false || !latest.effectiveUntil || latest.effectiveUntil <= new Date() || !state.template || templateSections.length === 0 || !state.retentionPolicy?.isActive || state.retentionPolicy.reportType !== manifest.reportType) throw new Error('PROVISION_POSTCONDITION_FAILED'); for (const [profile, identity] of Object.entries(target.identities)) { const expected = manifest.identities[profile].permissions; if (identity.operationalPermissions.length !== expected.length || !expected.every((p) => identity.operationalPermissions.includes(p))) throw new Error('PERMISSION_POSTCONDITION_FAILED'); } return sanitized('verify', target, state, false); }, { timeout: 60_000 });
}

async function rollback(prisma, runId) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`coro-demo-report-03:${manifest.organizationId}`}, 0))`;
    const target = await resolveTarget(tx); const now = new Date();
    for (const [profile, identity] of Object.entries(target.identities)) {
      const permissionRecord = await tx.demoFixtureRecord.findUnique({ where: fixtureWhere(`permissions-${profile}`) });
      const baseline = permissionRecord?.baseline && typeof permissionRecord.baseline === 'object' ? permissionRecord.baseline : {};
      const permissions = Array.isArray(baseline.operationalPermissions) ? baseline.operationalPermissions : [];
      await tx.clientUser.update({ where: { id: identity.id }, data: { operationalPermissions: permissions } });
      await tx.clientOperationalBuildingAssignment.updateMany({ where: { organizationId: manifest.organizationId, buildingId: target.building.id, clientUserId: identity.id, status: 'ACTIVE' }, data: { status: 'REVOKED', revokedAt: now, revokedByUserId: target.actor.id, revocationReason: 'CORO-DEMO-REPORT-03 governed rollback', lockVersion: { increment: 1 } } });
      await tx.incidentAuthorityAssignment.updateMany({ where: { organizationId: manifest.organizationId, buildingId: target.building.id, subjectType: 'CLIENT_USER', subjectId: identity.id, idempotencyKey: `coro-demo-report-03-${profile}`, status: 'ACTIVE' }, data: { status: 'REVOKED', revokedAt: now, revokedByType: 'USER', revokedById: target.actor.id, revocationReason: 'CORO-DEMO-REPORT-03 governed rollback', lockVersion: { increment: 1 } } });
    }
    const entitlementRecord = await tx.demoFixtureRecord.findUnique({ where: fixtureWhere('entitlement') });
    if (entitlementRecord) {
      const entitlement = await tx.capabilityEntitlement.findUnique({ where: { id: entitlementRecord.entityId }, include: { revisions: { orderBy: { versionNumber: 'desc' }, take: 1 } } });
      if (entitlement && entitlement.revisions[0]?.lifecycle !== 'REVOKED') await tx.capabilityEntitlementRevision.create({ data: { entitlementId: entitlement.id, versionNumber: entitlement.revisions[0].versionNumber + 1, lifecycle: 'REVOKED', enabled: false, distributable: false, decisionAt: now, effectiveFrom: now, effectiveUntil: null, reason: 'CORO-DEMO-REPORT-03 governed rollback', createdByUserId: target.actor.id, createdByDisplayName: 'CORO Demo governed rollback' } });
    }
    const templateRecord = await tx.demoFixtureRecord.findUnique({ where: fixtureWhere('template') });
    if (templateRecord) await tx.incidentReportTemplateVersion.updateMany({ where: { id: templateRecord.entityId, organizationId: manifest.organizationId }, data: { status: 'RETIRED', retiredAt: now } });
    await tx.demoFixtureRecord.updateMany({ where: { organizationId: manifest.organizationId, fixtureNamespace: manifest.fixtureNamespace }, data: { state: 'RETIRED' } });
    await tx.adminAuditEvent.create({ data: { actorType: 'INTERNAL_USER', actorUserId: target.actor.id, actorDisplayName: 'CORO Demo governed rollback', actorRole: target.actor.role, action: 'CORO_DEMO_REPORT_03_ROLLED_BACK', targetType: 'Organization', targetId: manifest.organizationId, organizationId: manifest.organizationId, reason: 'Governed safe-state return', requestId: String(runId) } });
    return { ...sanitized('rollback', target, await currentState(tx, target), true), safeState: true };
  }, { isolationLevel: 'Serializable', timeout: 60_000 });
}

async function run(prisma, mode, environment = process.env, runId = 'manual') {
  if (!MODES.has(mode)) throw new Error('INVALID_MODE');
  if (mode === 'preflight') return preflight(prisma, environment);
  if (mode === 'provision') return provision(prisma, environment, runId);
  if (mode === 'verify') return verify(prisma);
  return rollback(prisma, runId);
}

async function main() {
  if (process.env.CORO_DEMO_REPORT_03_RUN !== 'true') throw new Error('EXPLICIT_RUNTIME_SWITCH_REQUIRED');
  const mode = process.argv[2]; const { PrismaClient } = require('/app/node_modules/@prisma/client'); const prisma = new PrismaClient();
  try {
    process.stdout.write(`${JSON.stringify(await run(prisma, mode, process.env, process.env.GITHUB_RUN_ID))}\n`);
  } catch (error) {
    const candidate = error instanceof Error ? error.message : '';
    const errorCode = /^[A-Z][A-Z0-9_]{2,80}$/.test(candidate) ? candidate : 'INTERNAL_ERROR';
    process.stdout.write(`${JSON.stringify({ schemaVersion: 1, execution: 'FAIL', mode, errorCode })}\n`);
    process.exitCode = 1;
  } finally { await prisma.$disconnect(); }
}

module.exports = { fingerprint, normalize, resolveTarget, run };
if (require.main === module) main().catch((error) => { process.stdout.write(`${JSON.stringify({ schemaVersion: 1, execution: 'FAILED', failureCode: error.message })}\n`); process.exitCode = 1; });
