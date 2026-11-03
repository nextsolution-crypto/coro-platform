'use strict';
const { createHash } = require('node:crypto');
const QA = Object.freeze({ organizationName: 'CORO QA Production Email Acceptance', clientName: 'Client QA — courriels transactionnels', buildingName: 'Bâtiment QA — courriels transactionnels' });
const APPROVALS = Object.freeze({ 'dry-run': 'DRY_RUN_INCIDENT_PRODUCTION_QA_2026_11_03', prepare: 'PREPARE_INCIDENT_PRODUCTION_QA_2026_11_03', cleanup: 'CLEANUP_INCIDENT_PRODUCTION_QA_2026_11_03' });
const REASON = 'Recette synthétique de production Incident — accès temporaire en lecture — retrait en fin de campagne';
const SYSTEM_ACTOR = 'GOVERNED_INCIDENT_PRODUCTION_QA_ACCEPTANCE';
const FIXTURE_TRIGGER = 'QA ACCEPTATION INCIDENT — SYNTHÉTIQUE';
const FIXTURE_DESCRIPTION = 'Fixture synthétique en lecture seule. Aucune situation réelle.';
function assertApproval(env, phase) { if (!APPROVALS[phase] || env.INCIDENT_QA_PHASE !== phase || env.INCIDENT_QA_APPROVAL !== APPROVALS[phase]) throw new Error(`Exact ${phase} approval required.`); }
function assertFoundation({ organization, client, building, user }) {
  if (!organization?.isActive || organization.name !== QA.organizationName) throw new Error('QA organization mismatch.');
  if (!client?.isActive || client.organizationId !== organization.id || client.name !== QA.clientName) throw new Error('QA client mismatch.');
  if (!building?.isActive || building.organizationId !== organization.id || building.clientId !== client.id || building.name !== QA.buildingName) throw new Error('QA building mismatch.');
  if (!user || user.organizationId !== organization.id || user.clientId !== client.id || user.role !== 'CLIENT_MANAGER') throw new Error('QA ClientUser mismatch.');
  if (user.buildingIds.length !== 1 || user.buildingIds[0] !== building.id) throw new Error('QA ClientUser building scope mismatch.');
}
function buildFixtureData(scope, now) { return { buildingId: scope.building.id, organizationId: scope.organization.id, type: 'OTHER', status: 'ACTIVE', triggeredBy: FIXTURE_TRIGGER, description: FIXTURE_DESCRIPTION, occupantsSnapshot: [], teamSnapshot: [], procedureCode: 'P001', procedureSnapshot: [], assemblyPoint: null, interventionSheet: { synthetic: true, externalUsePermitted: false }, publicAccessToken: null, publicAccessExpiresAt: new Date(0), publicAccessRevokedAt: now, isExercise: true, isActive: true }; }
function assertFixture(fixture, scope) {
  if (!fixture || fixture.organizationId !== scope.organization.id || fixture.buildingId !== scope.building.id || fixture.triggeredBy !== FIXTURE_TRIGGER || fixture.description !== FIXTURE_DESCRIPTION || !fixture.isExercise) throw new Error('Synthetic Incident mismatch.');
  if (fixture.publicAccessToken !== null || !fixture.publicAccessRevokedAt || !fixture.publicAccessExpiresAt || fixture.publicAccessExpiresAt.getTime() > Date.now()) throw new Error('Synthetic Incident public capability is not disabled.');
}
function selectCampaignAssignments(assignments) { const campaign = assignments.filter((item) => item.grantReason === REASON); if (campaign.some((item) => item.permissions.length !== 1 || item.permissions[0] !== 'INCIDENT_READ')) throw new Error('Campaign assignment contains an unexpected permission.'); return campaign; }
function isAlreadyClean({ user, activeCampaignAssignments, devices, links, resets, fixture }) { return !user.isActive && !user.incidentPermissions.includes('INCIDENT_READ') && activeCampaignAssignments === 0 && devices === 0 && links === 0 && resets === 0 && fixture?.isActive === false && fixture?.status === 'CANCELLED' && Boolean(fixture.publicAccessRevokedAt); }
async function loadFoundation(prisma) {
  const organizations = await prisma.organization.findMany({ where: { name: QA.organizationName } }); if (organizations.length !== 1) throw new Error('QA organization is not unique.'); const organization = organizations[0];
  const clients = await prisma.client.findMany({ where: { organizationId: organization.id, name: QA.clientName } }); if (clients.length !== 1) throw new Error('QA client is not unique.'); const client = clients[0];
  const buildings = await prisma.building.findMany({ where: { organizationId: organization.id, clientId: client.id, name: QA.buildingName } }); if (buildings.length !== 1) throw new Error('QA building is not unique.'); const building = buildings[0];
  const users = await prisma.clientUser.findMany({ where: { organizationId: organization.id, clientId: client.id, role: 'CLIENT_MANAGER', buildingIds: { equals: [building.id] } } }); if (users.length !== 1) throw new Error('QA ClientUser is not unique.'); const user = users[0];
  assertFoundation({ organization, client, building, user }); return { organization, client, building, user };
}
async function readState(prisma, scope) {
  const [employees, occupants, activeIncidents, assignments, devices, links, resets] = await Promise.all([
    prisma.buildingEmployee.count({ where: { buildingId: scope.building.id } }), prisma.occupancyRecord.count({ where: { buildingId: scope.building.id, status: 'IN' } }), prisma.incidentEvent.findMany({ where: { buildingId: scope.building.id, isActive: true } }), prisma.incidentAuthorityAssignment.findMany({ where: { organizationId: scope.organization.id, buildingId: scope.building.id, subjectType: 'CLIENT_USER', subjectId: scope.user.id, status: 'ACTIVE' } }), prisma.clientTrustedDevice.count({ where: { userId: scope.user.id } }), prisma.magicLink.count({ where: { userId: scope.user.id, usedAt: null } }), prisma.clientPasswordResetToken.count({ where: { clientUserId: scope.user.id, usedAt: null } }),
  ]);
  const campaignFixtures = activeIncidents.filter((incident) => incident.triggeredBy === FIXTURE_TRIGGER && incident.description === FIXTURE_DESCRIPTION && incident.isExercise); const unrelatedIncidents = activeIncidents.filter((incident) => !campaignFixtures.includes(incident));
  return { employees, occupants, campaignFixtures, unrelatedIncidents, assignments, devices, links, resets };
}
function assertPreconditions(scope, state) {
  if (state.employees || state.occupants || state.unrelatedIncidents.length || state.campaignFixtures.length > 1) throw new Error('Synthetic building is not isolated enough for a notification-free fixture.');
  if (scope.user.incidentPermissions.some((permission) => permission !== 'INCIDENT_READ')) throw new Error('Unexpected pre-existing individual Incident permission.');
  const campaignAssignments = selectCampaignAssignments(state.assignments); if (state.assignments.length !== campaignAssignments.length) throw new Error('Unexpected pre-existing Incident assignment.');
  if (!state.campaignFixtures.length && (scope.user.isActive || scope.user.incidentPermissions.length || campaignAssignments.length)) throw new Error('QA identity is not in the expected inactive baseline.');
}
async function assertNoExternalEffects(prisma, incidentId) {
  const [deliveries, populationEvents, populationAlerts] = await Promise.all([prisma.incidentNotificationDelivery.count({ where: { incidentEventId: incidentId } }), prisma.populationOperationalEvent.count({ where: { incidentEventId: incidentId } }), prisma.populationAlert.count({ where: { incidentEventId: incidentId } })]);
  if (deliveries || populationEvents || populationAlerts) throw new Error('External-effect isolation verification failed.'); return { deliveries, populationEvents, populationAlerts };
}
async function dryRun(prisma, env) {
  assertApproval(env, 'dry-run'); const scope = await loadFoundation(prisma); const state = await readState(prisma, scope); assertPreconditions(scope, state);
  if (state.campaignFixtures[0]) { assertFixture(state.campaignFixtures[0], scope); await assertNoExternalEffects(prisma, state.campaignFixtures[0].id); }
  return { schemaVersion: 2, execution: 'PASS', phase: 'dry-run', productionMutation: false, identityActive: scope.user.isActive, individualIncidentPermissions: scope.user.incidentPermissions.length, activeCampaignAssignments: selectCampaignAssignments(state.assignments).length, activeCampaignFixtures: state.campaignFixtures.length, employees: state.employees, occupants: state.occupants, eligible: true };
}
async function prepare(prisma, env) {
  assertApproval(env, 'prepare'); const scope = await loadFoundation(prisma); const state = await readState(prisma, scope); assertPreconditions(scope, state); let fixture = state.campaignFixtures[0]; const resumed = Boolean(fixture);
  if (!fixture) {
    const now = new Date(); fixture = await prisma.$transaction(async (tx) => {
      await tx.clientTrustedDevice.deleteMany({ where: { userId: scope.user.id } }); await tx.magicLink.updateMany({ where: { userId: scope.user.id, usedAt: null }, data: { usedAt: now } }); await tx.clientPasswordResetToken.updateMany({ where: { clientUserId: scope.user.id, usedAt: null }, data: { usedAt: now } });
      await tx.clientUser.update({ where: { id: scope.user.id }, data: { isActive: true, sessionVersion: { increment: 1 }, mfaCode: null, mfaCodeExpiry: null } });
      const created = await tx.incidentEvent.create({ data: buildFixtureData(scope, now) }); await tx.incidentLog.create({ data: { incidentEventId: created.id, action: '[EXERCICE] Fixture QA créée', details: REASON, isAutomatic: true } });
      const canonical = JSON.stringify({ organizationId: scope.organization.id, buildingId: scope.building.id, incidentEventId: created.id, operation: 'INCIDENT_QA_FIXTURE_CREATED', actorType: 'SYSTEM', actorId: SYSTEM_ACTOR, reason: REASON, occurredAt: now.toISOString(), previousEventHash: null });
      await tx.incidentAuditEvent.create({ data: { organizationId: scope.organization.id, buildingId: scope.building.id, incidentEventId: created.id, operation: 'INCIDENT_QA_FIXTURE_CREATED', actorType: 'SYSTEM', actorId: SYSTEM_ACTOR, reason: REASON, requestId: env.GITHUB_RUN_ID || null, previousState: null, resultingState: { id: created.id, status: created.status, type: created.type, isExercise: true, publicCapability: 'DISABLED_AT_CREATION' }, occurredAt: now, previousEventHash: null, eventHash: createHash('sha256').update(canonical).digest('hex') } });
      await tx.adminAuditEvent.create({ data: { actorType: 'SYSTEM', systemActorKey: SYSTEM_ACTOR, actorDisplayName: 'Governed production maintenance', actorRole: 'SYSTEM', action: 'INCIDENT_QA_IDENTITY_REACTIVATED', targetType: 'ClientUser', targetId: scope.user.id, targetLabel: 'Synthetic Incident acceptance identity', organizationId: scope.organization.id, reason: REASON, requestId: env.GITHUB_RUN_ID || null, afterData: { active: true, clientId: scope.client.id, buildingId: scope.building.id, incidentId: created.id } } }); return created;
    });
  }
  const refreshedScope = await loadFoundation(prisma); assertFixture(fixture, refreshedScope); const external = await assertNoExternalEffects(prisma, fixture.id); if (!refreshedScope.user.isActive) throw new Error('QA identity is not active after preparation.');
  return { schemaVersion: 2, execution: 'PASS', phase: 'prepare', productionMutation: !resumed, organizationId: refreshedScope.organization.id, clientId: refreshedScope.client.id, buildingId: refreshedScope.building.id, clientUserId: refreshedScope.user.id, incidentId: fixture.id, exercise: true, identityActive: true, resumed, externalDeliveries: external.deliveries, populationEvents: external.populationEvents, populationAlerts: external.populationAlerts, publicCapability: 'DISABLED_AT_CREATION' };
}
async function resolveFixture(prisma, scope, explicitId) {
  if (explicitId) { const fixture = await prisma.incidentEvent.findFirst({ where: { id: explicitId, organizationId: scope.organization.id, buildingId: scope.building.id, isExercise: true } }); assertFixture(fixture, scope); return fixture; }
  const candidates = await prisma.incidentEvent.findMany({ where: { organizationId: scope.organization.id, buildingId: scope.building.id, triggeredBy: FIXTURE_TRIGGER, description: FIXTURE_DESCRIPTION, isExercise: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 2 }); if (candidates.length !== 1) throw new Error('Exact synthetic Incident id required because fixture discovery is ambiguous.'); assertFixture(candidates[0], scope); return candidates[0];
}
async function cleanup(prisma, env) {
  assertApproval(env, 'cleanup'); const scope = await loadFoundation(prisma); const fixture = await resolveFixture(prisma, scope, env.INCIDENT_QA_INCIDENT_ID || undefined); const state = await readState(prisma, scope); const campaignAssignments = selectCampaignAssignments(state.assignments);
  if (isAlreadyClean({ user: scope.user, activeCampaignAssignments: campaignAssignments.length, devices: state.devices, links: state.links, resets: state.resets, fixture })) return { schemaVersion: 2, execution: 'PASS', phase: 'cleanup', productionMutation: false, alreadyFinalized: true, incidentId: fixture.id, residualAccess: false };
  const now = new Date(); const preservedPermissions = scope.user.incidentPermissions.filter((permission) => permission !== 'INCIDENT_READ');
  await prisma.$transaction(async (tx) => {
    if (campaignAssignments.length) await tx.incidentAuthorityAssignment.updateMany({ where: { id: { in: campaignAssignments.map((item) => item.id) }, status: 'ACTIVE', grantReason: REASON }, data: { status: 'REVOKED', revokedByType: 'SYSTEM', revokedById: SYSTEM_ACTOR, revokedAt: now, revocationReason: REASON, lockVersion: { increment: 1 } } });
    await tx.clientTrustedDevice.deleteMany({ where: { userId: scope.user.id } }); await tx.magicLink.updateMany({ where: { userId: scope.user.id, usedAt: null }, data: { usedAt: now } }); await tx.clientPasswordResetToken.updateMany({ where: { clientUserId: scope.user.id, usedAt: null }, data: { usedAt: now } }); await tx.clientUser.update({ where: { id: scope.user.id }, data: { incidentPermissions: preservedPermissions, isActive: false, sessionVersion: { increment: 1 }, mfaCode: null, mfaCodeExpiry: null } });
    if (fixture.isActive || fixture.status !== 'CANCELLED') { await tx.incidentTask.updateMany({ where: { incidentEventId: fixture.id, status: { notIn: ['COMPLETED', 'CANCELLED'] } }, data: { status: 'CANCELLED', escalationStatus: 'CANCELLED', escalationCancelledAt: now, escalationCancellationReason: REASON, ackRevokedAt: now } }); await tx.incidentEvent.update({ where: { id: fixture.id }, data: { status: 'CANCELLED', isActive: false, publicAccessToken: null, publicAccessRevokedAt: now, publicAccessExpiresAt: new Date(0), lockVersion: { increment: 1 } } }); await tx.incidentLog.create({ data: { incidentEventId: fixture.id, action: '[EXERCICE] Fixture QA désactivée', details: REASON, isAutomatic: true } }); }
    await tx.adminAuditEvent.create({ data: { actorType: 'SYSTEM', systemActorKey: SYSTEM_ACTOR, actorDisplayName: 'Governed production maintenance', actorRole: 'SYSTEM', action: 'INCIDENT_QA_ACCEPTANCE_CLEANED_UP', targetType: 'ClientUser', targetId: scope.user.id, targetLabel: 'Synthetic Incident acceptance identity', organizationId: scope.organization.id, reason: REASON, requestId: env.GITHUB_RUN_ID || null, beforeData: { active: scope.user.isActive, incidentId: fixture.id, campaignAssignmentCount: campaignAssignments.length }, afterData: { active: false, incidentId: fixture.id, preservedIncidentPermissions: preservedPermissions } } });
  });
  const finalScope = await loadFoundation(prisma); const finalState = await readState(prisma, finalScope); const finalFixture = await prisma.incidentEvent.findUnique({ where: { id: fixture.id } }); const finalCampaignAssignments = selectCampaignAssignments(finalState.assignments); const pass = isAlreadyClean({ user: finalScope.user, activeCampaignAssignments: finalCampaignAssignments.length, devices: finalState.devices, links: finalState.links, resets: finalState.resets, fixture: finalFixture });
  return { schemaVersion: 2, execution: pass ? 'PASS' : 'FAIL', phase: 'cleanup', productionMutation: true, alreadyFinalized: false, clientUserId: finalScope.user.id, incidentId: fixture.id, identityActive: finalScope.user.isActive, individualIncidentRead: finalScope.user.incidentPermissions.includes('INCIDENT_READ'), activeCampaignAssignments: finalCampaignAssignments.length, trustedDevices: finalState.devices, activeMagicLinks: finalState.links, activePasswordResetLinks: finalState.resets, fixtureActive: finalFixture.isActive, fixtureStatus: finalFixture.status, publicCapabilityRevoked: finalFixture.publicAccessToken === null && Boolean(finalFixture.publicAccessRevokedAt), residualAccess: !pass };
}
async function run(env = process.env) { const phase = env.INCIDENT_QA_PHASE; if (!Object.hasOwn(APPROVALS, phase)) throw new Error('Unsupported phase.'); const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); try { if (phase === 'dry-run') return await dryRun(prisma, env); if (phase === 'prepare') return await prepare(prisma, env); return await cleanup(prisma, env); } finally { await prisma.$disconnect(); } }
if (!module.parent) run().then((result) => process.stdout.write(`${JSON.stringify(result)}\n`)).catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { QA, APPROVALS, REASON, FIXTURE_TRIGGER, FIXTURE_DESCRIPTION, assertApproval, assertFoundation, buildFixtureData, assertFixture, selectCampaignAssignments, isAlreadyClean };
