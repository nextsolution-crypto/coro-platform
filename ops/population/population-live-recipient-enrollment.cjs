'use strict';

const APPROVAL = 'SP_OPS_04B_RECIPIENT_ENROLLMENT_2026_11_08';
const TARGET = Object.freeze({
  organizationId: '916f54ec-af22-45e0-99db-a369d9630002',
  clientId: 'd3000001-0000-4000-8000-000000000002',
  buildingId: '6a1b6f2e-38b2-5f41-a740-48252fd11224',
  publicSlug: 'coro-sp-ops-04b-test',
  syntheticSubscriberId: '52387b91-139b-5e48-9eca-50e1b54735d1',
});

function assertAuthority(mode, env) {
  if (!['OPEN', 'CLOSE', 'STATUS'].includes(mode)) throw new Error('ENROLLMENT_MODE_INVALID');
  if (env.CORO_POPULATION_RECIPIENT_ENROLLMENT !== 'true' || env.CORO_POPULATION_RECIPIENT_ENROLLMENT_APPROVAL !== APPROVAL) {
    throw new Error('EXACT_ENROLLMENT_APPROVAL_REQUIRED');
  }
  if (env.POPULATION_CONTROLLED_LIVE_TEST_ENABLED === 'true' || env.POPULATION_CONTROLLED_LIVE_TEST_STOP !== 'true') {
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

async function execute(prisma, mode, env = process.env) {
  assertAuthority(mode, env);
  const [environment, program] = await Promise.all([
    prisma.demoEnvironment.findUnique({ where: { organizationId: TARGET.organizationId } }),
    prisma.populationProgram.findUnique({
      where: { publicSlug: TARGET.publicSlug },
      include: { rueFacilityProfile: { include: { building: true } }, subscribers: { select: { id: true, isSynthetic: true, status: true } } },
    }),
  ]);
  assertFoundation(environment, program);

  const nonSyntheticCount = program.subscribers.filter((item) => !item.isSynthetic).length;
  if (nonSyntheticCount > 1) throw new Error('QA_RECIPIENT_CARDINALITY_INVALID');
  if (mode === 'OPEN' && nonSyntheticCount !== 0) throw new Error('QA_RECIPIENT_ALREADY_EXISTS_RECONCILE_FIRST');

  if (mode !== 'STATUS') {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'sp-ops-04b-recipient-enrollment'}, 0))`;
      const current = await tx.populationProgram.findUnique({ where: { id: program.id }, include: { rueFacilityProfile: true, subscribers: { select: { id: true, isSynthetic: true } } } });
      if (!current || current.deliveryMode !== 'SANDBOX' || current.governanceMode !== 'DUAL_CONTROL') throw new Error('QA_PROGRAM_CHANGED_CONCURRENTLY');
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

if (require.main === module) main().catch(() => { process.stdout.write('{"schemaVersion":1,"execution":"FAILED"}\n'); process.exitCode = 1; });
module.exports = { APPROVAL, TARGET, assertAuthority, assertFoundation, execute };
