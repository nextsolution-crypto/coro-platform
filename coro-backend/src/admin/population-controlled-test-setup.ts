import { createHash } from 'crypto';
import {
  CoroActorType,
  PopulationDeliveryMode,
  PopulationGovernanceMode,
  PopulationProgramStatus,
  Prisma,
  PrismaClient,
  RueAssessmentStatus,
  RueDataSource,
  RueProtectiveAction,
  RueScenarioType,
} from '@prisma/client';

export const CONTROLLED_TEST_ORGANIZATION_ID =
  '916f54ec-af22-45e0-99db-a369d9630002';
export const CONTROLLED_TEST_ENVIRONMENT = 'CORO_DEMO_SP_OPS_04B';
export const CONTROLLED_TEST_BUILDING_ID =
  '6a1b6f2e-38b2-5f41-a740-48252fd11224';
export const CONTROLLED_TEST_PUBLIC_SLUG = 'coro-sp-ops-04b-test';
const SETUP_REFERENCE = 'CORO_SP_OPS_04B_CONTROLLED_TEST_V1';

type SetupDatabase = PrismaClient | Prisma.TransactionClient;

export type ControlledTestSetupInput = {
  allowSetup?: string;
  environment?: string;
  organizationId?: string;
  clientId?: string;
  allowedClientId?: string;
  buildingId?: string;
  publicSlug?: string;
  actorUserId?: string;
  dryRun?: string;
};

export type ControlledTestSetupResult = {
  dryRun: boolean;
  organizationId: string;
  clientId: string;
  buildingId: string;
  facilityProfileId: string;
  scenarioId: string;
  zoneId: string;
  programId: string;
  publicSlug: string;
  programStatus: PopulationProgramStatus;
  deliveryMode: PopulationDeliveryMode;
  governanceMode: PopulationGovernanceMode;
  subscriberCount: 0;
};

type ValidatedInput = {
  dryRun: boolean;
  organizationId: string;
  clientId: string;
  buildingId: string;
  publicSlug: string;
  actorUserId: string;
};

function deterministicUuid(scope: string): string {
  const bytes = Buffer.from(
    createHash('sha256')
      .update(`${SETUP_REFERENCE}:${scope}`)
      .digest()
      .subarray(0, 16),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const IDS = Object.freeze({
  profile: deterministicUuid('facility-profile'),
  scenario: deterministicUuid('scenario'),
  zone: deterministicUuid('impact-zone'),
  program: deterministicUuid('population-program'),
  audit: deterministicUuid('audit'),
});

function validateInput(input: ControlledTestSetupInput): ValidatedInput {
  if (input.allowSetup !== 'true') {
    throw new Error('ALLOW_POPULATION_CONTROLLED_TEST_SETUP=true est requis.');
  }
  if (input.environment !== CONTROLLED_TEST_ENVIRONMENT) {
    throw new Error('Environnement de provisionnement non autorise.');
  }
  if (input.organizationId !== CONTROLLED_TEST_ORGANIZATION_ID) {
    throw new Error('Organisation de provisionnement non autorisee.');
  }
  if (
    !input.clientId ||
    !input.allowedClientId ||
    input.clientId !== input.allowedClientId
  ) {
    throw new Error('Client non explicitement autorise.');
  }
  if (input.buildingId !== CONTROLLED_TEST_BUILDING_ID) {
    throw new Error('Batiment de provisionnement non autorise.');
  }
  if (input.publicSlug !== CONTROLLED_TEST_PUBLIC_SLUG) {
    throw new Error('Slug de provisionnement non autorise.');
  }
  if (!input.actorUserId) {
    throw new Error('Administrateur interne responsable requis.');
  }
  return {
    dryRun: input.dryRun === 'true',
    organizationId: input.organizationId,
    clientId: input.clientId,
    buildingId: input.buildingId,
    publicSlug: input.publicSlug,
    actorUserId: input.actorUserId,
  };
}

async function validateDatabaseState(db: SetupDatabase, input: ValidatedInput) {
  const [
    organization,
    client,
    actor,
    building,
    profile,
    programBySlug,
    scenario,
    zone,
  ] = await Promise.all([
    db.organization.findUnique({
      where: { id: input.organizationId },
      select: { id: true, isActive: true, isInternal: true },
    }),
    db.client.findUnique({
      where: { id: input.clientId },
      select: { id: true, organizationId: true, isActive: true },
    }),
    db.user.findUnique({
      where: { id: input.actorUserId },
      select: {
        id: true,
        organizationId: true,
        isActive: true,
        role: true,
      },
    }),
    db.building.findUnique({
      where: { id: input.buildingId },
      select: {
        id: true,
        organizationId: true,
        clientId: true,
        name: true,
        buildingType: true,
        rueFacilityProfile: {
          select: {
            id: true,
            assessmentReference: true,
            populationProgram: {
              select: {
                id: true,
                publicSlug: true,
                status: true,
                deliveryMode: true,
                governanceMode: true,
              },
            },
          },
        },
      },
    }),
    db.rueFacilityProfile.findUnique({
      where: { id: IDS.profile },
      select: { id: true, buildingId: true, assessmentReference: true },
    }),
    db.populationProgram.findUnique({
      where: { publicSlug: input.publicSlug },
      select: { id: true, rueFacilityProfileId: true },
    }),
    db.rueEmergencyScenario.findUnique({
      where: { id: IDS.scenario },
      select: { id: true, facilityProfileId: true, sourceReference: true },
    }),
    db.rueImpactZone.findUnique({
      where: { id: IDS.zone },
      select: { id: true, scenarioId: true, sourceReference: true },
    }),
  ]);

  if (!organization || !organization.isActive || organization.isInternal) {
    throw new Error('Organisation Demo inactive, interne ou introuvable.');
  }
  if (
    !client ||
    !client.isActive ||
    client.organizationId !== input.organizationId
  ) {
    throw new Error('Client inactif, introuvable ou hors organisation.');
  }
  if (
    !actor ||
    !actor.isActive ||
    actor.organizationId !== input.organizationId ||
    !['ADMIN', 'SUPER_ADMIN'].includes(actor.role)
  ) {
    throw new Error(
      'Administrateur interne inactif, hors tenant ou non habilite.',
    );
  }
  if (
    building &&
    (building.organizationId !== input.organizationId ||
      building.clientId !== input.clientId ||
      building.name !== 'Usine Demo Nord - SP-OPS-04B' ||
      building.buildingType !== 'QA_FICTITIOUS_SENTINELLE_POPULATION')
  ) {
    throw new Error('Collision avec un batiment existant non gere.');
  }
  if (
    building?.rueFacilityProfile &&
    (building.rueFacilityProfile.id !== IDS.profile ||
      building.rueFacilityProfile.assessmentReference !== SETUP_REFERENCE)
  ) {
    throw new Error('Le batiment possede un profil RUE non gere.');
  }
  const existingProgram = building?.rueFacilityProfile?.populationProgram;
  if (
    existingProgram &&
    (existingProgram.id !== IDS.program ||
      existingProgram.publicSlug !== input.publicSlug ||
      existingProgram.status !== PopulationProgramStatus.CONFIGURING ||
      existingProgram.deliveryMode !== PopulationDeliveryMode.SANDBOX ||
      existingProgram.governanceMode !== PopulationGovernanceMode.DUAL_CONTROL)
  ) {
    throw new Error('Le batiment possede un programme Population non gere.');
  }
  if (
    profile &&
    (profile.buildingId !== input.buildingId ||
      profile.assessmentReference !== SETUP_REFERENCE)
  ) {
    throw new Error('Collision avec un profil RUE existant non gere.');
  }
  if (
    programBySlug &&
    (programBySlug.id !== IDS.program ||
      programBySlug.rueFacilityProfileId !== IDS.profile)
  ) {
    throw new Error('Le slug appartient a un autre programme.');
  }
  if (
    scenario &&
    (scenario.facilityProfileId !== IDS.profile ||
      scenario.sourceReference !== SETUP_REFERENCE)
  ) {
    throw new Error('Collision avec un scenario existant non gere.');
  }
  if (
    zone &&
    (zone.scenarioId !== IDS.scenario ||
      zone.sourceReference !== SETUP_REFERENCE)
  ) {
    throw new Error('Collision avec une zone existante non geree.');
  }
}

function result(input: ValidatedInput): ControlledTestSetupResult {
  return {
    dryRun: input.dryRun,
    organizationId: input.organizationId,
    clientId: input.clientId,
    buildingId: input.buildingId,
    facilityProfileId: IDS.profile,
    scenarioId: IDS.scenario,
    zoneId: IDS.zone,
    programId: IDS.program,
    publicSlug: input.publicSlug,
    programStatus: PopulationProgramStatus.CONFIGURING,
    deliveryMode: PopulationDeliveryMode.SANDBOX,
    governanceMode: PopulationGovernanceMode.DUAL_CONTROL,
    subscriberCount: 0,
  };
}

async function createMissingRows(
  tx: Prisma.TransactionClient,
  input: ValidatedInput,
) {
  const now = new Date();
  await tx.building.upsert({
    where: { id: input.buildingId },
    create: {
      id: input.buildingId,
      organizationId: input.organizationId,
      clientId: input.clientId,
      name: 'Usine Demo Nord - SP-OPS-04B',
      address: '1000 rue Demonstration',
      city: 'Boucherville',
      province: 'QC',
      postalCode: 'J4B 0A0',
      buildingType: 'QA_FICTITIOUS_SENTINELLE_POPULATION',
      latitude: 45.5,
      longitude: -73.4,
      isActive: true,
    },
    update: {},
  });
  await tx.rueFacilityProfile.upsert({
    where: { id: IDS.profile },
    create: {
      id: IDS.profile,
      buildingId: input.buildingId,
      assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
      assessmentSource: RueDataSource.MANUAL,
      assessedAt: now,
      assessedByType: CoroActorType.SYSTEM,
      assessmentNotes:
        'TEST CONTROLE SP-OPS-04B - installation entierement fictive.',
      assessmentReference: SETUP_REFERENCE,
      populationEnabled: true,
    },
    update: {},
  });
  await tx.rueEmergencyScenario.upsert({
    where: { id: IDS.scenario },
    create: {
      id: IDS.scenario,
      facilityProfileId: IDS.profile,
      nameFR: "EXERCICE / TEST - Rejet simule d'ammoniac",
      nameEN: 'EXERCISE / TEST - Simulated ammonia release',
      description: 'Scenario fictif reserve a SP-OPS-04B.',
      type: RueScenarioType.OTHER,
      eventType: 'TEST',
      impactDistanceKm: 1,
      impactMethod: 'Zone radiale QA fictive',
      defaultProtectiveAction: RueProtectiveAction.SHELTER_IN_PLACE,
      publicInstructionFR:
        "EXERCICE / TEST CORO - AUCUNE URGENCE REELLE. Aucune mesure de protection n'est requise.",
      publicInstructionEN:
        'CORO EXERCISE / TEST - NO REAL EMERGENCY. No protective action is required.',
      source: RueDataSource.MANUAL,
      sourceReference: SETUP_REFERENCE,
      validatedAt: now,
      validatedByType: CoroActorType.SYSTEM,
      isActive: true,
    },
    update: {},
  });
  await tx.rueImpactZone.upsert({
    where: { id: IDS.zone },
    create: {
      id: IDS.zone,
      scenarioId: IDS.scenario,
      code: 'SP-OPS-04B-QA-ZONE',
      nameFR: 'Zone fictive SP-OPS-04B',
      nameEN: 'SP-OPS-04B fictional zone',
      description: 'Zone fictive sans association a une urgence reelle.',
      geometry: Prisma.DbNull,
      maxDistanceKm: 1,
      protectiveAction: RueProtectiveAction.SHELTER_IN_PLACE,
      instructionFR:
        "EXERCICE / TEST CORO - Aucune mesure de protection n'est requise.",
      instructionEN: 'CORO EXERCISE / TEST - No protective action is required.',
      determinationMethod: 'Rayon QA fictif de 1 km',
      sourceReference: SETUP_REFERENCE,
      source: RueDataSource.MANUAL,
      validatedAt: now,
      validatedByType: CoroActorType.SYSTEM,
      isActive: true,
    },
    update: {},
  });
  await tx.populationProgram.upsert({
    where: { id: IDS.program },
    create: {
      id: IDS.program,
      rueFacilityProfileId: IDS.profile,
      status: PopulationProgramStatus.CONFIGURING,
      deliveryMode: PopulationDeliveryMode.SANDBOX,
      governanceMode: PopulationGovernanceMode.DUAL_CONTROL,
      publicSlug: input.publicSlug,
      nameFR: 'Sentinelle Population - Essai controle SP-OPS-04B',
      nameEN: 'Sentinelle Population - SP-OPS-04B controlled test',
      descriptionFR:
        'Programme fictif isole. Aucun envoi reel sans autorisation distincte.',
      descriptionEN:
        'Isolated fictional program. No real delivery without separate authorization.',
      registrationEnabled: false,
      smsEnabled: false,
      emailEnabled: false,
    },
    update: {},
  });
  await tx.auditLog.upsert({
    where: { id: IDS.audit },
    create: {
      id: IDS.audit,
      action: 'POPULATION_CONTROLLED_TEST_PROVISIONED',
      entityType: 'PopulationProgram',
      entityId: IDS.program,
      userId: input.actorUserId,
      organizationId: input.organizationId,
      description:
        'Provisionnement gouverne SANDBOX / DUAL_CONTROL SP-OPS-04B.',
      metadata: {
        setupReference: SETUP_REFERENCE,
        buildingId: input.buildingId,
        deliveryMode: PopulationDeliveryMode.SANDBOX,
        governanceMode: PopulationGovernanceMode.DUAL_CONTROL,
        realRecipients: 0,
      },
    },
    update: {},
  });
}

export async function setupPopulationControlledTest(
  prisma: PrismaClient,
  rawInput: ControlledTestSetupInput,
): Promise<ControlledTestSetupResult> {
  const input = validateInput(rawInput);
  await validateDatabaseState(prisma, input);
  if (input.dryRun) return result(input);

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${SETUP_REFERENCE}))`;
      await validateDatabaseState(tx, input);
      await createMissingRows(tx, input);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  return result(input);
}
