'use strict';

const { createHash } = require('node:crypto');

const APPROVAL = 'SP_OPS_04B_FINAL_SANDBOX_SIMULATION_2026_11_08';
const TARGET = Object.freeze({
  organizationId: '916f54ec-af22-45e0-99db-a369d9630002',
  clientId: 'd3000001-0000-4000-8000-000000000002',
  buildingId: '6a1b6f2e-38b2-5f41-a740-48252fd11224',
  programSlug: 'coro-sp-ops-04b-test',
  preparerId: 'bd4a710f-5eef-5db0-82f0-4787d0b7e46f',
  approverId: 'dcb755b3-d1ad-5e92-bdae-0fb3daab21ba',
  subscriberId: '52387b91-139b-5e48-9eca-50e1b54735d1',
  title: 'EXERCICE / TEST CORO - Simulation finale SP-OPS-04B',
});

function resolveCompiledModule(root, basename) {
  const fs = require('node:fs'); const path = require('node:path'); const absoluteRoot = path.resolve(root); const matches = [];
  const visit = (directory) => { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { const candidate = path.join(directory, entry.name); if (entry.isSymbolicLink()) continue; if (entry.isDirectory()) visit(candidate); else if (entry.isFile() && entry.name === basename) matches.push(candidate); } };
  visit(absoluteRoot);
  if (matches.length !== 1 || !matches[0].startsWith(`${absoluteRoot}${path.sep}`)) throw new Error(`QA_RUNTIME_MODULE_${matches.length ? 'AMBIGUOUS' : 'MISSING'}:${basename}`);
  return matches[0];
}

function assertAuthority(env) {
  if (env.CORO_POPULATION_FINAL_SIMULATION !== 'true' || env.CORO_POPULATION_FINAL_SIMULATION_APPROVAL !== APPROVAL) throw new Error('EXACT_FINAL_SIMULATION_APPROVAL_REQUIRED');
  if (env.POPULATION_CONTROLLED_LIVE_TEST_ENABLED === 'true' || env.POPULATION_CONTROLLED_LIVE_TEST_STOP !== 'true') throw new Error('CONTROLLED_LIVE_SAFETY_STATE_INVALID');
}

function actor(user) {
  return { sub: user.id, clientId: user.clientId, organizationId: user.organizationId, role: user.role, buildingIds: user.buildingIds };
}

function assertFoundation({ environment, program, scenario, preparer, approver }) {
  if (!environment || environment.status !== 'ACTIVE' || environment.communicationMode !== 'SIMULATE' || environment.externalProvidersDisabled !== true) throw new Error('DEMO_SIMULATION_POLICY_INVALID');
  if (!program || program.publicSlug !== TARGET.programSlug || program.deliveryMode !== 'SANDBOX' || program.governanceMode !== 'DUAL_CONTROL') throw new Error('QA_PROGRAM_GOVERNANCE_INVALID');
  if (!scenario?.isActive || scenario.facilityProfileId !== program.rueFacilityProfileId) throw new Error('QA_SCENARIO_INVALID');
  const exact = (user, id, role, permissions) => user?.id === id && user.isActive && user.organizationId === TARGET.organizationId && user.clientId === TARGET.clientId && user.role === role && user.buildingIds.length === 1 && user.buildingIds[0] === TARGET.buildingId && JSON.stringify([...user.populationPermissions].sort()) === JSON.stringify([...permissions].sort());
  if (!exact(preparer, TARGET.preparerId, 'CLIENT_MANAGER', ['POPULATION_PREPARE', 'POPULATION_SEND'])) throw new Error('QA_PREPARER_AUTHORITY_INVALID');
  if (!exact(approver, TARGET.approverId, 'CLIENT_CORPORATE', ['POPULATION_APPROVE'])) throw new Error('QA_APPROVER_AUTHORITY_INVALID');
  if (preparer.id === approver.id) throw new Error('QA_DUAL_CONTROL_IDENTITIES_NOT_DISTINCT');
}

async function execute(env = process.env) {
  assertAuthority(env);
  const { NestFactory } = require('@nestjs/core');
  const { PrismaClient } = require('@prisma/client');
  const root = '/app/dist';
  const { AppModule } = require(resolveCompiledModule(root, 'app.module.js'));
  const { ClientPortalService } = require(resolveCompiledModule(root, 'client-portal.service.js'));
  const { PopulationDeliveryService } = require(resolveCompiledModule(root, 'population-delivery.service.js'));
  const prisma = new PrismaClient();
  let app;
  try {
    const [environment, program, preparer, approver] = await Promise.all([
      prisma.demoEnvironment.findUnique({ where: { organizationId: TARGET.organizationId } }),
      prisma.populationProgram.findUnique({ where: { publicSlug: TARGET.programSlug } }),
      prisma.clientUser.findUnique({ where: { id: TARGET.preparerId } }),
      prisma.clientUser.findUnique({ where: { id: TARGET.approverId } }),
    ]);
    const scenario = program && await prisma.rueEmergencyScenario.findFirst({ where: { facilityProfileId: program.rueFacilityProfileId, sourceReference: 'CORO_SP_OPS_04B_CONTROLLED_TEST_V1' } });
    assertFoundation({ environment, program, scenario, preparer, approver });
    const existing = await prisma.populationAlert.findFirst({ where: { programId: program.id, titleFR: TARGET.title }, include: { deliveries: true } });
    if (existing) throw new Error('FINAL_SIMULATION_ALREADY_EXISTS_RECONCILE_ONLY');

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'sp-ops-04b-final-sandbox-simulation'}, 0))`;
      if (await tx.populationAlert.count({ where: { programId: program.id, titleFR: TARGET.title } })) throw new Error('FINAL_SIMULATION_CONCURRENT_COLLISION');
      const nonSynthetic = await tx.populationSubscriber.count({ where: { programId: program.id, isSynthetic: false } });
      if (nonSynthetic) throw new Error('QA_PROGRAM_HAS_NON_SYNTHETIC_RECIPIENTS');
      await tx.populationProgram.update({ where: { id: program.id }, data: { status: 'ACTIVE', registrationEnabled: false, smsEnabled: true, emailEnabled: true } });
      await tx.populationSubscriber.upsert({
        where: { id: TARGET.subscriberId },
        create: { id: TARGET.subscriberId, programId: program.id, status: 'ACTIVE', isSynthetic: true, preferredLanguage: 'FR', firstName: 'Destinataire', lastName: 'Synthétique QA', phone: '+15555550123', phoneCanonical: '+15555550123', email: 'sp-ops-04b-recipient@example.invalid', emailCanonical: 'sp-ops-04b-recipient@example.invalid', smsEnabled: true, emailEnabled: true, latitude: 45.5, longitude: -73.4, locationSource: 'SYNTHETIC_QA', locationResolvedAt: new Date(), verifiedAt: new Date(), identityAuthorityAt: new Date() },
        update: {},
      });
    });

    app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const portal = app.get(ClientPortalService);
    const transport = app.get(PopulationDeliveryService);
    const preparerActor = actor(preparer); const approverActor = actor(approver);
    const draft = await portal.createPopulationAlertDraft(TARGET.buildingId, {
      scenarioId: scenario.id, type: 'TEST', targetingMode: 'GLOBAL', targetingConfirmed: true,
      titleFR: TARGET.title, titleEN: 'CORO EXERCISE / TEST - Final SP-OPS-04B simulation',
      messageFR: "EXERCICE / TEST CORO - AUCUNE URGENCE REELLE. Verification technique Sentinelle Population. Aucune mesure de protection n'est requise.",
      messageEN: 'CORO EXERCISE / TEST - NO REAL EMERGENCY. Sentinelle Population technical verification. No protective action is required.',
      instructionFR: "Aucune action réelle n'est requise.", instructionEN: 'No real action is required.',
    }, preparerActor);
    const ready = await portal.markPopulationAlertReady(TARGET.buildingId, draft.id, preparerActor);
    let selfApprovalRefused = false;
    try { await portal.approvePopulationAlert(TARGET.buildingId, draft.id, preparerActor); } catch { selfApprovalRefused = true; }
    if (!selfApprovalRefused) throw new Error('QA_SELF_APPROVAL_WAS_NOT_REFUSED');
    const approved = await portal.approvePopulationAlert(TARGET.buildingId, draft.id, approverActor);
    const frozen = await portal.freezePopulationAlertRecipients(TARGET.buildingId, draft.id, preparerActor);
    if (frozen.targeting.subscriberCount !== 1 || frozen.targeting.smsDeliveryCount !== 1 || frozen.targeting.emailDeliveryCount !== 1 || frozen.targeting.suppressedCount !== 2) throw new Error('QA_FROZEN_ROSTER_UNEXPECTED');

    const simulatedSms = await transport.sendSms('+15555550123', 'EXERCICE / TEST CORO - AUCUNE URGENCE REELLE', TARGET.organizationId, 'POPULATION_SANDBOX_FINAL_SIMULATION_SMS', `${draft.id}:sandbox-sms`);
    const simulatedEmail = await transport.sendEmail({ destination: 'sp-ops-04b-recipient@example.invalid', subject: 'EXERCICE / TEST CORO - AUCUNE URGENCE REELLE', html: '<p>Verification technique simulee.</p>', organizationId: TARGET.organizationId, operation: 'POPULATION_SANDBOX_FINAL_SIMULATION_EMAIL', providerIdempotencyKey: `${draft.id}:sandbox-email` });
    if (simulatedSms.provider !== 'DEMO_SIMULATED' || simulatedEmail.provider !== 'DEMO_SIMULATED') throw new Error('QA_PROVIDER_SIMULATION_NOT_ENFORCED');

    const sent = await portal.sendPopulationAlert(TARGET.buildingId, draft.id, preparerActor);
    const ended = await portal.endPopulationAlert(TARGET.buildingId, draft.id, preparerActor);
    const eventId = ended.operationalEventId;
    if (!eventId) throw new Error('QA_OPERATIONAL_EVENT_MISSING');
    const closed = await portal.closePopulationOperationalEvent(TARGET.buildingId, eventId, { forceClose: true, confirmIncompleteDelivery: true, closeReason: 'Simulation SANDBOX: livraisons volontairement supprimées, aucun fournisseur réel.' }, preparerActor);
    const evidence = await portal.generatePopulationEvidence(TARGET.buildingId, eventId, preparerActor);
    await portal.generatePopulationEvidenceManifest(TARGET.buildingId, evidence.id, preparerActor);
    const integrity = await portal.verifyPopulationEvidence(TARGET.buildingId, evidence.id, preparerActor);
    const report = await portal.generatePopulationEvidenceReport(TARGET.buildingId, evidence.id, preparerActor);
    const communications = await prisma.demoCommunicationEvent.count({ where: { organizationId: TARGET.organizationId, idempotencyKey: { in: [`${draft.id}:sandbox-sms`, `${draft.id}:sandbox-email`] }, simulated: true, blocked: false } });
    const finalDeliveries = await prisma.populationAlertDelivery.findMany({ where: { alertId: draft.id }, select: { channel: true, status: true, suppressionReason: true, destinationSnapshot: true } });
    if (communications !== 2 || finalDeliveries.some((d) => d.status !== 'SUPPRESSED' || d.suppressionReason !== 'SANDBOX_MODE' || d.destinationSnapshot !== null)) throw new Error('QA_SIMULATION_EVIDENCE_INVALID');
    await prisma.populationProgram.update({ where: { id: program.id }, data: { status: 'CONFIGURING', registrationEnabled: false, smsEnabled: false, emailEnabled: false } });
    return { schemaVersion: 1, execution: 'PASS', draftCreated: draft.status === 'DRAFT', ready: ready.status === 'READY', distinctApproval: approved.approvedById === TARGET.approverId, selfApprovalRefused, frozenSubscriberCount: 1, frozenDeliveryCount: 2, simulatedTransportEvents: communications, smsSimulated: simulatedSms.provider === 'DEMO_SIMULATED', emailSimulated: simulatedEmail.provider === 'DEMO_SIMULATED', campaignStatus: ended.status, operationalEventStatus: closed.status, evidenceStatus: evidence.status, integrityStatus: integrity.status, reportCreated: Boolean(report?.id), liveProviderCalls: 0, programReturnedSafe: true };
  } finally {
    if (app) await app.close();
    await prisma.$disconnect();
  }
}

if (!module.parent) execute().then((result) => process.stdout.write(`${JSON.stringify(result)}\n`)).catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
module.exports = { APPROVAL, TARGET, actor, assertAuthority, assertFoundation, resolveCompiledModule, execute };
