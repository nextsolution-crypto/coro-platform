'use strict';

const APPROVAL = 'SP_OPS_04B_RECIPIENT_ENROLLMENT_2026_11_08';
const TRANSPORT_APPROVAL = 'SP_OPS_04B_PINNED_TRANSPORT_2026_11_08';
const { createHash } = require('node:crypto');
const TARGET = Object.freeze({
  organizationId: '916f54ec-af22-45e0-99db-a369d9630002',
  programId: '915d3ef5-8e6b-5cb3-94d5-c038ddbe06d7',
  clientId: 'd3000001-0000-4000-8000-000000000002',
  buildingId: '6a1b6f2e-38b2-5f41-a740-48252fd11224',
  publicSlug: 'coro-sp-ops-04b-test',
  syntheticSubscriberId: '52387b91-139b-5e48-9eca-50e1b54735d1',
  operatorEmail: 'demo@getcoro.io',
  preparerId: 'bd4a710f-5eef-5db0-82f0-4787d0b7e46f',
  approverId: 'dcb755b3-d1ad-5e92-bdae-0fb3daab21ba',
});

function assertAuthority(mode, env) {
  if (!['OPEN', 'CLOSE', 'STATUS', 'ARM', 'DISARM'].includes(mode)) throw new Error('ENROLLMENT_MODE_INVALID');
  if (env.CORO_POPULATION_RECIPIENT_ENROLLMENT !== 'true' || env.CORO_POPULATION_RECIPIENT_ENROLLMENT_APPROVAL !== APPROVAL) {
    throw new Error('EXACT_ENROLLMENT_APPROVAL_REQUIRED');
  }
  if (['ARM', 'DISARM'].includes(mode) && env.CORO_POPULATION_CONTROLLED_TRANSPORT_APPROVAL !== TRANSPORT_APPROVAL) throw new Error('EXACT_TRANSPORT_PREPARATION_APPROVAL_REQUIRED');
  if (mode !== 'DISARM' && (env.POPULATION_CONTROLLED_LIVE_TEST_ENABLED !== 'false' || env.POPULATION_CONTROLLED_LIVE_TEST_STOP !== 'true')) {
    throw new Error('CONTROLLED_LIVE_SAFETY_STATE_INVALID');
  }
}

function assertFoundation(environment, program) {
  if (!environment || environment.status !== 'ACTIVE' || environment.communicationMode !== 'SIMULATE' || environment.externalProvidersDisabled !== true) {
    throw new Error('DEMO_SIMULATION_POLICY_INVALID');
  }
  if (!program || program.publicSlug !== TARGET.publicSlug || program.deliveryMode !== 'SANDBOX' || program.governanceMode !== 'DUAL_CONTROL') {
    throw new Error('QA_PROGRAM_GOVERNANCE_INVALID');
  }
  if (program.rueFacilityProfile?.buildingId !== TARGET.buildingId || program.rueFacilityProfile?.building?.clientId !== TARGET.clientId || program.rueFacilityProfile?.building?.organizationId !== TARGET.organizationId) {
    throw new Error('QA_PROGRAM_SCOPE_INVALID');
  }
}

function assertOperator(operator) {
  if (
    !operator ||
    typeof operator.email !== 'string' ||
    operator.email.toLowerCase() !== TARGET.operatorEmail ||
    operator.organizationId !== TARGET.organizationId ||
    operator.isActive !== true ||
    !['ADMIN', 'SUPER_ADMIN'].includes(operator.role)
  ) {
    throw new Error('QA_ENROLLMENT_OPERATOR_INVALID');
  }
}

function auditId(action, alertId) {
  const h = createHash('sha256').update(`SP_OPS_04B:${action}:${alertId}`).digest('hex').slice(0, 32);
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

function assertTransportScope(program, env) {
  if (!program || program.id !== TARGET.programId || program.publicSlug !== TARGET.publicSlug || program.governanceMode !== 'DUAL_CONTROL' ||
    program.rueFacilityProfile?.buildingId !== TARGET.buildingId ||
    program.rueFacilityProfile?.building?.clientId !== TARGET.clientId ||
    program.rueFacilityProfile?.building?.organizationId !== TARGET.organizationId ||
    env.POPULATION_CONTROLLED_LIVE_TEST_ORGANIZATION_ID !== TARGET.organizationId ||
    env.POPULATION_CONTROLLED_LIVE_TEST_PROGRAM_ID !== program.id) throw new Error('QA_TRANSPORT_SCOPE_INVALID');
}

function assertArmCampaign(program, alert, actors, env, now = Date.now()) {
  const expires = Date.parse(env.POPULATION_CONTROLLED_LIVE_TEST_EXPIRES_AT ?? '');
  if (!env.POPULATION_CONTROLLED_LIVE_TEST_ALERT_ID || alert?.id !== env.POPULATION_CONTROLLED_LIVE_TEST_ALERT_ID ||
    !Number.isFinite(expires) || expires <= now || expires - now > 3600000) throw new Error('QA_CAMPAIGN_PIN_INVALID');
  if (program.status !== 'ACTIVE' || !['SANDBOX', 'LIVE'].includes(program.deliveryMode) ||
    !alert || alert.programId !== program.id || alert.type !== 'TEST' || alert.status !== 'DRAFT' ||
    alert.recipientsFrozenAt || alert.approvedAt || alert.createdByType !== 'CLIENT_USER' ||
    alert.createdById !== TARGET.preparerId || (alert.institutionTargets ?? []).length) throw new Error('QA_ARM_CAMPAIGN_STATE_INVALID');
  const authority = (id, role, permissions) => actors.some(a => a.id === id && a.isActive && a.role === role &&
    a.organizationId === TARGET.organizationId && a.clientId === TARGET.clientId &&
    a.buildingIds.length === 1 && a.buildingIds[0] === TARGET.buildingId &&
    JSON.stringify([...a.populationPermissions].sort()) === JSON.stringify([...permissions].sort()));
  if (!authority(TARGET.preparerId, 'CLIENT_MANAGER', ['POPULATION_PREPARE', 'POPULATION_SEND']) ||
    !authority(TARGET.approverId, 'CLIENT_CORPORATE', ['POPULATION_APPROVE'])) throw new Error('QA_DUAL_AUTHORITY_INVALID');
  const recipients = program.subscribers.filter(s => !s.isSynthetic);
  const owner = recipients[0]; const hash = v => createHash('sha256').update(v).digest('hex');
  if (recipients.length !== 1 || owner.status !== 'ACTIVE' || !owner.smsEnabled || !owner.emailEnabled ||
    !owner.phoneCanonical || !owner.emailCanonical || owner.email?.trim().toLowerCase() !== owner.emailCanonical ||
    owner.latitude == null || owner.longitude == null || !owner.locationResolvedAt ||
    !owner.verifications.some(v => v.channel === 'SMS' && v.verifiedAt) ||
    !owner.verifications.some(v => v.channel === 'EMAIL' && v.verifiedAt) ||
    !owner.consentEvents?.some(v => v.type !== 'UNSUBSCRIBED' && v.consentVersion === program.consentVersion && v.smsEnabled && v.emailEnabled) ||
    !owner.smsConsentEvidence?.some(v => v.verifiedAt && v.consentVersion === program.consentVersion && v.smsEnabled) ||
    hash(owner.phoneCanonical) !== env.POPULATION_CONTROLLED_LIVE_TEST_SMS_SHA256 ||
    hash(owner.emailCanonical) !== env.POPULATION_CONTROLLED_LIVE_TEST_EMAIL_SHA256 ||
    program.subscribers.some(s => s.isSynthetic && (s.status === 'ACTIVE' || s.smsEnabled || s.emailEnabled))) throw new Error('QA_VERIFIED_RECIPIENT_INVALID');
  const scenario = alert.emergencyScenario; const file = scenario?.dispersionSourceFile;
  const dateUsable = value => !value || new Date(value).getTime() > now;
  if (!scenario?.isActive || scenario.facilityProfileId !== program.rueFacilityProfileId ||
    !scenario.dispersionReviewedAt || scenario.dispersionReviewedByType !== 'CLIENT_USER' ||
    scenario.dispersionReviewedById !== TARGET.approverId || !file ||
    file.organizationId !== TARGET.organizationId || file.buildingId !== TARGET.buildingId ||
    file.visibility !== 'shared' || file.status !== 'valide' || file.lifecycleState !== 'APPROVED' || file.revokedAt ||
    (file.effectiveAt && new Date(file.effectiveAt).getTime() > now) ||
    !dateUsable(file.expiresAt) || !dateUsable(file.supersededEffectiveAt) ||
    !scenario.impactZones.some(z => z.isActive && z.approvedForAlerting && z.alertingApprovedAt &&
      z.alertingApprovedByType === 'CLIENT_USER' && z.alertingApprovedById === TARGET.approverId &&
      z.purpose === 'PUBLIC_NOTIFICATION' && (z.geometry || z.maxDistanceKm != null))) throw new Error('QA_REVIEWED_SOURCE_AND_ZONE_REQUIRED');
  if (env.POPULATION_SMS_PRODUCTION_VALIDATED !== 'false' || env.POPULATION_SMS_TFN_APPROVED !== 'true' ||
    env.BREVO_SMS_SENDER !== '+18335886812' || env.POPULATION_BREVO_EMAIL_SENDER_VERIFIED !== 'true' ||
    !env.BREVO_API_KEY?.trim() || !env.BREVO_SENDER_EMAIL?.trim() ||
    ['POPULATION_BREVO_WEBHOOK_SECRET', 'POPULATION_BREVO_SMS_WEBHOOK_SECRET'].some(k => Buffer.byteLength(env[k] ?? '', 'utf8') < 32) ||
    env.POPULATION_CONTROLLED_LIVE_TEST_MAX_CAMPAIGN_CAD_CENTS !== '100' ||
    !/^\d+$/.test(env.POPULATION_CONTROLLED_LIVE_TEST_SMS_CANADA_CAD_MICROS_PER_SEGMENT ?? '') ||
    Number(env.POPULATION_CONTROLLED_LIVE_TEST_SMS_CANADA_CAD_MICROS_PER_SEGMENT) < 1 ||
    !/^\d+$/.test(env.POPULATION_CONTROLLED_LIVE_TEST_EMAIL_CAD_MICROS_PER_MESSAGE ?? '')) throw new Error('QA_PROVIDER_PREPARATION_INVALID');
}

async function prepareTransport(prisma, mode, env) {
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'sp-ops-04b-recipient-enrollment'}, 0))`;
    await tx.$queryRaw`SELECT id FROM "PopulationProgram" WHERE id = ${TARGET.programId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "User" WHERE email = ${TARGET.operatorEmail} FOR SHARE`;
    if (mode === 'ARM') {
      await tx.$queryRaw`SELECT id FROM "DemoEnvironment" WHERE "organizationId" = ${TARGET.organizationId} FOR SHARE`;
      await tx.$queryRaw`SELECT id FROM "ClientUser" WHERE id IN (${TARGET.preparerId}, ${TARGET.approverId}) FOR SHARE`;
      await tx.$queryRaw`SELECT id FROM "PopulationAlert" WHERE id = ${env.POPULATION_CONTROLLED_LIVE_TEST_ALERT_ID ?? ''} AND "programId" = ${TARGET.programId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "PopulationSubscriber" WHERE "programId" = ${TARGET.programId} FOR SHARE`;
      await tx.$queryRaw`SELECT s.id FROM "RueEmergencyScenario" s JOIN "PopulationAlert" a ON a."emergencyScenarioId" = s.id WHERE a.id = ${env.POPULATION_CONTROLLED_LIVE_TEST_ALERT_ID ?? ''} AND a."programId" = ${TARGET.programId} FOR SHARE OF s`;
      await tx.$queryRaw`SELECT f.id FROM "ProjectFile" f JOIN "RueEmergencyScenario" s ON s."dispersionSourceFileId" = f.id JOIN "PopulationAlert" a ON a."emergencyScenarioId" = s.id WHERE a.id = ${env.POPULATION_CONTROLLED_LIVE_TEST_ALERT_ID ?? ''} AND a."programId" = ${TARGET.programId} FOR SHARE OF f`;
      await tx.$queryRaw`SELECT z.id FROM "RueImpactZone" z JOIN "PopulationAlert" a ON a."emergencyScenarioId" = z."scenarioId" WHERE a.id = ${env.POPULATION_CONTROLLED_LIVE_TEST_ALERT_ID ?? ''} AND a."programId" = ${TARGET.programId} FOR SHARE OF z`;
    }
    const [environment, program, operator] = await Promise.all([
      tx.demoEnvironment.findUnique({ where: { organizationId: TARGET.organizationId } }),
      tx.populationProgram.findUnique({ where: { id: TARGET.programId }, include: {
        rueFacilityProfile: { include: { building: true } }, subscribers: { include: { verifications: true, consentEvents: { orderBy: { occurredAt: 'desc' }, take: 1 }, smsConsentEvidence: { where: { verifiedAt: { not: null } } } } },
      } }),
      tx.user.findUnique({ where: { email: TARGET.operatorEmail }, select: { id: true, email: true, organizationId: true, isActive: true, role: true } }),
    ]);
    assertOperator(operator); assertTransportScope(program, env);
    if (mode === 'ARM' && (!environment || environment.status !== 'ACTIVE' || environment.communicationMode !== 'SIMULATE' || !environment.externalProvidersDisabled)) throw new Error('DEMO_SIMULATION_POLICY_INVALID');
    const pinnedId = env.POPULATION_CONTROLLED_LIVE_TEST_ALERT_ID ?? 'closed-scope';
    const eventId = auditId(mode, pinnedId);
    const prior = await tx.auditLog.findUnique({ where: { id: eventId }, select: { id: true } });
    if (mode === 'ARM') {
      const [alert, actors, pending] = await Promise.all([
        tx.populationAlert.findUnique({ where: { id: pinnedId }, include: {
          institutionTargets: true, emergencyScenario: { include: { dispersionSourceFile: true, impactZones: true } },
        } }),
        tx.clientUser.findMany({ where: { id: { in: [TARGET.preparerId, TARGET.approverId] } } }),
        tx.populationAlertDelivery.count({ where: { alert: { programId: program.id },
          OR: [{ status: { in: ['QUEUED', 'SENDING'] } }, { alert: { deliveryModeSnapshot: 'LIVE' } }],
        } }),
      ]);
      assertArmCampaign(program, alert, actors, env);
      if (pending) throw new Error('QA_EXISTING_TRANSPORT_REQUIRES_RECONCILIATION');
      if (prior && program.deliveryMode !== 'LIVE') throw new Error('QA_ARM_AUTHORITY_ALREADY_CLOSED');
      if (program.deliveryMode === 'LIVE' && !prior) throw new Error('QA_UNATTESTED_LIVE_PROGRAM');
      if (!prior) await tx.populationProgram.update({ where: { id: program.id }, data: { deliveryMode: 'LIVE', registrationEnabled: false } });
    } else {
      if (!['LIVE', 'SANDBOX'].includes(program.deliveryMode)) throw new Error('QA_PROGRAM_GOVERNANCE_INVALID');
      await tx.populationProgram.update({ where: { id: program.id }, data: {
        deliveryMode: 'SANDBOX', status: 'SUSPENDED', registrationEnabled: false, smsEnabled: false, emailEnabled: false,
      } });
    }
    if (!prior) await tx.auditLog.create({ data: {
      id: eventId, action: mode === 'ARM' ? 'POPULATION_CONTROLLED_TRANSPORT_PREPARED' : 'POPULATION_CONTROLLED_TRANSPORT_CLOSED',
      entityType: 'PopulationProgram', entityId: program.id, organizationId: TARGET.organizationId,
      userId: operator.id, clientUserId: null, description: 'Governed pinned Population commissioning preparation; no provider call.',
      metadata: { approval: TRANSPORT_APPROVAL, mode, alertId: env.POPULATION_CONTROLLED_LIVE_TEST_ALERT_ID ?? null, providerCalls: 0 },
    } });
  });
  const after = await prisma.populationProgram.findUnique({ where: { id: TARGET.programId } });
  return { schemaVersion: 1, execution: 'PASS', mode, status: after.status, deliveryMode: after.deliveryMode,
    governanceMode: after.governanceMode, registrationEnabled: after.registrationEnabled,
    smsEnabled: after.smsEnabled, emailEnabled: after.emailEnabled,
    controlledLiveEnabled: env.POPULATION_CONTROLLED_LIVE_TEST_ENABLED === 'true',
    stopActive: env.POPULATION_CONTROLLED_LIVE_TEST_STOP === 'true', providerCalls: 0,
    globalSmsValidated: env.POPULATION_SMS_PRODUCTION_VALIDATED === 'true',
    programTransportBlocked: after.status !== 'ACTIVE' || after.deliveryMode !== 'LIVE',
  };
}

async function execute(prisma, mode, env = process.env) {
  assertAuthority(mode, env);
  if (mode === 'ARM' || mode === 'DISARM') return prepareTransport(prisma, mode, env);
  const [environment, program, operator] = await Promise.all([
    prisma.demoEnvironment.findUnique({ where: { organizationId: TARGET.organizationId } }),
    prisma.populationProgram.findUnique({
      where: { publicSlug: TARGET.publicSlug },
      include: { rueFacilityProfile: { include: { building: true } }, subscribers: { select: { id: true, isSynthetic: true, status: true } } },
    }),
    prisma.user.findUnique({
      where: { email: TARGET.operatorEmail },
      select: { id: true, email: true, organizationId: true, isActive: true, role: true },
    }),
  ]);
  assertFoundation(environment, program);
  assertOperator(operator);

  const nonSyntheticCount = program.subscribers.filter((item) => !item.isSynthetic).length;
  if (nonSyntheticCount > 1) throw new Error('QA_RECIPIENT_CARDINALITY_INVALID');
  if (mode === 'OPEN' && nonSyntheticCount !== 0) throw new Error('QA_RECIPIENT_ALREADY_EXISTS_RECONCILE_FIRST');

  if (mode !== 'STATUS') {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'sp-ops-04b-recipient-enrollment'}, 0))`;
      const [current, currentOperator] = await Promise.all([
        tx.populationProgram.findUnique({ where: { id: program.id }, include: { rueFacilityProfile: true, subscribers: { select: { id: true, isSynthetic: true } } } }),
        tx.user.findUnique({
          where: { email: TARGET.operatorEmail },
          select: { id: true, email: true, organizationId: true, isActive: true, role: true },
        }),
      ]);
      if (!current || current.deliveryMode !== 'SANDBOX' || current.governanceMode !== 'DUAL_CONTROL') throw new Error('QA_PROGRAM_CHANGED_CONCURRENTLY');
      assertOperator(currentOperator);
      if (currentOperator.id !== operator.id) throw new Error('QA_ENROLLMENT_OPERATOR_CHANGED_CONCURRENTLY');
      if (mode === 'OPEN') {
        if (current.status !== 'CONFIGURING' || current.subscribers.some((item) => !item.isSynthetic)) throw new Error('QA_ENROLLMENT_OPEN_PRECONDITION_FAILED');
        await tx.populationSubscriber.updateMany({ where: { programId: current.id, isSynthetic: true }, data: { status: 'UNSUBSCRIBED', smsEnabled: false, emailEnabled: false } });
        await tx.rueFacilityProfile.update({ where: { id: current.rueFacilityProfileId }, data: { populationEnabled: true } });
        await tx.populationProgram.update({ where: { id: current.id }, data: {
          status: 'ACTIVE', registrationEnabled: true, smsEnabled: true, emailEnabled: true,
          privacyTextFR: 'Les coordonnees saisies servent uniquement a verifier le parcours controle Sentinelle Population SP-OPS-04B.',
          privacyTextEN: 'The contact details entered are used only to verify the controlled Sentinelle Population SP-OPS-04B workflow.',
          consentTextFR: "EXERCICE / TEST CORO. J'accepte de recevoir les codes de verification et, uniquement apres autorisation finale distincte, un SMS et un courriel d'exercice.",
          consentTextEN: 'CORO EXERCISE / TEST. I agree to receive verification codes and, only after separate final authorization, one exercise SMS and one exercise email.',
          consentVersion: 'sp-ops-04b-controlled-test-v1',
        } });
      } else {
        await tx.rueFacilityProfile.update({ where: { id: current.rueFacilityProfileId }, data: { populationEnabled: false } });
        await tx.populationProgram.update({ where: { id: current.id }, data: { status: 'CONFIGURING', registrationEnabled: false, smsEnabled: false, emailEnabled: false } });
      }
      await tx.auditLog.create({ data: {
        action: mode === 'OPEN' ? 'POPULATION_CONTROLLED_RECIPIENT_ENROLLMENT_OPENED' : 'POPULATION_CONTROLLED_RECIPIENT_ENROLLMENT_CLOSED',
        entityType: 'PopulationProgram', entityId: current.id, organizationId: TARGET.organizationId,
        userId: currentOperator.id, clientUserId: null,
        description: 'SP-OPS-04B governed recipient enrollment window.',
        metadata: { approval: APPROVAL, buildingId: TARGET.buildingId, mode, liveEnabled: false, stopActive: true, providerCalls: 0 },
      } });
    });
  }

  const after = await prisma.populationProgram.findUnique({ where: { id: program.id }, include: { rueFacilityProfile: true, subscribers: { select: { isSynthetic: true, status: true } } } });
  const realRecipients = after.subscribers.filter((item) => !item.isSynthetic);
  return {
    schemaVersion: 1, execution: 'PASS', mode, publicPath: `/population/${TARGET.publicSlug}`,
    status: after.status, deliveryMode: after.deliveryMode, governanceMode: after.governanceMode,
    registrationEnabled: after.registrationEnabled, smsEnabled: after.smsEnabled, emailEnabled: after.emailEnabled,
    populationEnabled: after.rueFacilityProfile.populationEnabled, nonSyntheticRecipientCount: realRecipients.length,
    controlledLiveEnabled: false, stopActive: true, providerCalls: 0,
  };
}

async function main() {
  const { PrismaClient } = require('/app/node_modules/@prisma/client');
  const prisma = new PrismaClient();
  try { process.stdout.write(`${JSON.stringify(await execute(prisma, process.env.ENROLLMENT_MODE, process.env))}\n`); }
  finally { await prisma.$disconnect(); }
}

const SAFE_ERROR_CODES = new Set([
  'EXACT_TRANSPORT_PREPARATION_APPROVAL_REQUIRED', 'QA_TRANSPORT_SCOPE_INVALID', 'QA_CAMPAIGN_PIN_INVALID',
  'QA_ARM_CAMPAIGN_STATE_INVALID', 'QA_DUAL_AUTHORITY_INVALID', 'QA_VERIFIED_RECIPIENT_INVALID',
  'QA_REVIEWED_SOURCE_AND_ZONE_REQUIRED', 'QA_PROVIDER_PREPARATION_INVALID', 'QA_EXISTING_TRANSPORT_REQUIRES_RECONCILIATION',
  'QA_ARM_AUTHORITY_ALREADY_CLOSED', 'QA_UNATTESTED_LIVE_PROGRAM',
  'ENROLLMENT_MODE_INVALID', 'EXACT_ENROLLMENT_APPROVAL_REQUIRED', 'CONTROLLED_LIVE_SAFETY_STATE_INVALID',
  'DEMO_SIMULATION_POLICY_INVALID', 'QA_PROGRAM_GOVERNANCE_INVALID', 'QA_PROGRAM_SCOPE_INVALID',
  'QA_ENROLLMENT_OPERATOR_INVALID', 'QA_ENROLLMENT_OPERATOR_CHANGED_CONCURRENTLY',
  'QA_RECIPIENT_CARDINALITY_INVALID', 'QA_RECIPIENT_ALREADY_EXISTS_RECONCILE_FIRST',
  'QA_PROGRAM_CHANGED_CONCURRENTLY', 'QA_ENROLLMENT_OPEN_PRECONDITION_FAILED',
]);
function safeErrorCode(error) {
  const value = error instanceof Error ? error.message : '';
  return SAFE_ERROR_CODES.has(value) ? value : 'UNCLASSIFIED_ENROLLMENT_FAILURE';
}

if (!module.parent) main().catch((error) => {
  process.stdout.write(`${JSON.stringify({ schemaVersion: 1, execution: 'FAILED', errorCode: safeErrorCode(error) })}\n`);
  process.exitCode = 1;
});
module.exports = { APPROVAL, TRANSPORT_APPROVAL, TARGET, assertTransportScope, assertArmCampaign, assertAuthority, assertFoundation, assertOperator, execute, safeErrorCode };
