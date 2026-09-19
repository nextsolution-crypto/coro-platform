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

const PREMONT_BUILDING_ID = 'demo-premont-industrial-001';
const PREMONT_PROFILE_ID = 'demo-premont-rue-profile-001';
const PREMONT_PUBLIC_SLUG = 'premont-boucherville';
const SETUP_REFERENCE = 'CORO_POPULATION_LIVE_VALIDATION_V1';
const ZONE_CODE = 'TEST-ZONE-01';
const ZONE_RADIUS_KM = 1;

type SetupDatabase = PrismaClient | Prisma.TransactionClient;

export type PopulationLiveSetupInput = {
  allowSetup?: string;
  buildingId?: string;
  publicSlug?: string;
  programNameFR?: string;
  programNameEN?: string;
  dryRun?: string;
};

export type PopulationLiveSetupResult = {
  buildingId: string;
  facilityProfileId: string;
  scenarioId: string;
  zoneId: string;
  programId: string;
  publicSlug: string;
  programStatus: PopulationProgramStatus;
  deliveryMode: PopulationDeliveryMode;
  governanceMode: PopulationGovernanceMode;
  emailEnabled: boolean;
  smsEnabled: boolean;
};

type ValidatedInput = {
  buildingId: string;
  publicSlug: string;
  programNameFR: string;
  programNameEN: string;
  dryRun: boolean;
};

function deterministicUuid(scope: string, buildingId: string): string {
  const bytes = Buffer.from(
    createHash('sha256')
      .update(`${SETUP_REFERENCE}:${scope}:${buildingId}`)
      .digest()
      .subarray(0, 16),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function validateInput(input: PopulationLiveSetupInput): ValidatedInput {
  if (input.allowSetup !== 'true') {
    throw new Error(
      'Setup refuse: ALLOW_POPULATION_LIVE_SETUP=true est requis.',
    );
  }

  const buildingId = input.buildingId?.trim();
  const publicSlug = input.publicSlug?.trim().toLowerCase();
  if (!buildingId || !publicSlug) {
    throw new Error('BUILDING_ID et PUBLIC_SLUG sont requis.');
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(publicSlug)) {
    throw new Error('PUBLIC_SLUG doit etre un slug minuscule valide.');
  }
  if (
    buildingId === PREMONT_BUILDING_ID ||
    publicSlug === PREMONT_PUBLIC_SLUG
  ) {
    throw new Error('Setup refuse: les ressources Premont sont protegees.');
  }

  return {
    buildingId,
    publicSlug,
    programNameFR:
      input.programNameFR?.trim() ||
      'Sentinelle Population — Validation LIVE',
    programNameEN:
      input.programNameEN?.trim() ||
      'Sentinelle Population — LIVE Validation',
    dryRun: input.dryRun === 'true',
  };
}

function expectedIds(buildingId: string) {
  return {
    profile: deterministicUuid('facility-profile', buildingId),
    scenario: deterministicUuid('scenario', buildingId),
    zone: deterministicUuid('impact-zone', buildingId),
    program: deterministicUuid('population-program', buildingId),
  };
}

async function validateDatabaseState(
  db: SetupDatabase,
  input: ValidatedInput,
  ids: ReturnType<typeof expectedIds>,
) {
  const building = await db.building.findUnique({
    where: { id: input.buildingId },
    select: {
      id: true,
      clientId: true,
      organizationId: true,
      latitude: true,
      longitude: true,
    },
  });
  if (!building) throw new Error('Batiment introuvable.');
  if (!building.clientId || !building.organizationId) {
    throw new Error('Batiment sans clientId ou organizationId exploitable.');
  }
  if (
    building.latitude === null ||
    !Number.isFinite(building.latitude) ||
    building.latitude < -90 ||
    building.latitude > 90 ||
    building.longitude === null ||
    !Number.isFinite(building.longitude) ||
    building.longitude < -180 ||
    building.longitude > 180
  ) {
    throw new Error('Batiment sans coordonnees exploitables.');
  }

  const [profile, slugProgram, expectedScenario, expectedZone] =
    await Promise.all([
      db.rueFacilityProfile.findUnique({
        where: { buildingId: input.buildingId },
        include: { populationProgram: true },
      }),
      db.populationProgram.findUnique({
        where: { publicSlug: input.publicSlug },
        include: { rueFacilityProfile: { select: { buildingId: true } } },
      }),
      db.rueEmergencyScenario.findUnique({ where: { id: ids.scenario } }),
      db.rueImpactZone.findUnique({ where: { id: ids.zone } }),
    ]);

  if (profile?.id === PREMONT_PROFILE_ID) {
    throw new Error('Setup refuse: profil Premont protege.');
  }
  if (profile && profile.id !== ids.profile) {
    throw new Error('Le batiment possede deja un profil RUE non gere.');
  }
  if (profile && profile.assessmentReference !== SETUP_REFERENCE) {
    throw new Error('Le profil RUE determine existe mais n est pas gere.');
  }
  if (
    profile?.populationProgram &&
    (profile.populationProgram.id !== ids.program ||
      profile.populationProgram.publicSlug !== input.publicSlug)
  ) {
    throw new Error('Le batiment possede deja un programme Population different.');
  }
  if (
    slugProgram &&
    (slugProgram.id !== ids.program ||
      slugProgram.rueFacilityProfile.buildingId !== input.buildingId)
  ) {
    throw new Error('PUBLIC_SLUG appartient deja a un autre programme.');
  }
  if (slugProgram && slugProgram.status !== PopulationProgramStatus.CONFIGURING) {
    throw new Error(
      'Le programme gere a quitte CONFIGURING; le helper refuse de le modifier.',
    );
  }
  if (
    expectedScenario &&
    (expectedScenario.facilityProfileId !== ids.profile ||
      expectedScenario.sourceReference !== SETUP_REFERENCE)
  ) {
    throw new Error('Collision incoherente sur le scenario determine.');
  }
  if (
    expectedZone &&
    (expectedZone.scenarioId !== ids.scenario ||
      expectedZone.sourceReference !== SETUP_REFERENCE)
  ) {
    throw new Error('Collision incoherente sur la zone determinee.');
  }
}

function resultFor(
  input: ValidatedInput,
  ids: ReturnType<typeof expectedIds>,
): PopulationLiveSetupResult {
  return {
    buildingId: input.buildingId,
    facilityProfileId: ids.profile,
    scenarioId: ids.scenario,
    zoneId: ids.zone,
    programId: ids.program,
    publicSlug: input.publicSlug,
    programStatus: PopulationProgramStatus.CONFIGURING,
    deliveryMode: PopulationDeliveryMode.LIVE,
    governanceMode: PopulationGovernanceMode.STANDARD,
    emailEnabled: true,
    smsEnabled: false,
  };
}

async function mutate(
  tx: Prisma.TransactionClient,
  input: ValidatedInput,
  ids: ReturnType<typeof expectedIds>,
) {
  const now = new Date();
  await tx.rueFacilityProfile.upsert({
    where: { id: ids.profile },
    create: {
      id: ids.profile,
      buildingId: input.buildingId,
      assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
      assessmentSource: RueDataSource.MANUAL,
      assessedAt: now,
      assessedByType: CoroActorType.SYSTEM,
      assessmentNotes: 'TEST - environnement de validation LIVE controle.',
      assessmentReference: SETUP_REFERENCE,
      populationEnabled: true,
    },
    update: {
      assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
      assessmentSource: RueDataSource.MANUAL,
      assessmentNotes: 'TEST - environnement de validation LIVE controle.',
      assessmentReference: SETUP_REFERENCE,
      populationEnabled: true,
    },
  });

  await tx.rueEmergencyScenario.upsert({
    where: { id: ids.scenario },
    create: {
      id: ids.scenario,
      facilityProfileId: ids.profile,
      nameFR: 'TEST — Validation Sentinelle Population',
      nameEN: 'TEST — Sentinelle Population Validation',
      description: 'TEST - scenario controle sans urgence reelle.',
      type: RueScenarioType.OTHER,
      eventType: 'TEST',
      impactDistanceKm: ZONE_RADIUS_KM,
      impactMethod: 'Zone radiale de validation manuelle',
      defaultProtectiveAction: RueProtectiveAction.SHELTER_IN_PLACE,
      publicInstructionFR:
        "TEST DE DÉMONSTRATION CORO.\nAucune urgence réelle.\nAucune action de protection n'est requise.",
      publicInstructionEN:
        'CORO DEMONSTRATION TEST.\nNo real emergency.\nNo protective action is required.',
      source: RueDataSource.MANUAL,
      sourceReference: SETUP_REFERENCE,
      validatedAt: now,
      validatedByType: CoroActorType.SYSTEM,
      isActive: true,
    },
    update: {
      nameFR: 'TEST — Validation Sentinelle Population',
      nameEN: 'TEST — Sentinelle Population Validation',
      defaultProtectiveAction: RueProtectiveAction.SHELTER_IN_PLACE,
      publicInstructionFR:
        "TEST DE DÉMONSTRATION CORO.\nAucune urgence réelle.\nAucune action de protection n'est requise.",
      publicInstructionEN:
        'CORO DEMONSTRATION TEST.\nNo real emergency.\nNo protective action is required.',
      sourceReference: SETUP_REFERENCE,
      validatedAt: now,
      validatedByType: CoroActorType.SYSTEM,
      isActive: true,
    },
  });

  await tx.rueImpactZone.upsert({
    where: { id: ids.zone },
    create: {
      id: ids.zone,
      scenarioId: ids.scenario,
      code: ZONE_CODE,
      nameFR: 'Zone de validation — TEST',
      nameEN: 'Validation zone — TEST',
      description: 'TEST - zone radiale de validation controlee.',
      geometry: Prisma.DbNull,
      maxDistanceKm: ZONE_RADIUS_KM,
      protectiveAction: RueProtectiveAction.SHELTER_IN_PLACE,
      instructionFR:
        "TEST DE DÉMONSTRATION CORO. Aucune action de protection n'est requise.",
      instructionEN:
        'CORO DEMONSTRATION TEST. No protective action is required.',
      determinationMethod: 'Rayon de validation de 1 km autour du site',
      sourceReference: SETUP_REFERENCE,
      source: RueDataSource.MANUAL,
      validatedAt: now,
      validatedByType: CoroActorType.SYSTEM,
      isActive: true,
    },
    update: {
      code: ZONE_CODE,
      nameFR: 'Zone de validation — TEST',
      nameEN: 'Validation zone — TEST',
      geometry: Prisma.DbNull,
      maxDistanceKm: ZONE_RADIUS_KM,
      protectiveAction: RueProtectiveAction.SHELTER_IN_PLACE,
      sourceReference: SETUP_REFERENCE,
      validatedAt: now,
      validatedByType: CoroActorType.SYSTEM,
      isActive: true,
    },
  });

  await tx.populationProgram.upsert({
    where: { id: ids.program },
    create: {
      id: ids.program,
      rueFacilityProfileId: ids.profile,
      status: PopulationProgramStatus.CONFIGURING,
      deliveryMode: PopulationDeliveryMode.LIVE,
      governanceMode: PopulationGovernanceMode.STANDARD,
      publicSlug: input.publicSlug,
      nameFR: input.programNameFR,
      nameEN: input.programNameEN,
      descriptionFR:
        'Programme TEST de validation controlee de Sentinelle Population.',
      descriptionEN:
        'Controlled TEST program for Sentinelle Population validation.',
      registrationEnabled: true,
      smsEnabled: false,
      emailEnabled: true,
      privacyTextFR:
        "Les coordonnees fournies servent uniquement a l'inscription et aux alertes de ce programme.",
      privacyTextEN:
        'Contact information is used only for registration and alerts from this program.',
      consentTextFR:
        "Je consens a recevoir par courriel les alertes de ce programme et je peux me desabonner en tout temps.",
      consentTextEN:
        'I consent to receive this program email alerts and may unsubscribe at any time.',
      consentVersion: 'live-validation-v1',
    },
    update: {
      deliveryMode: PopulationDeliveryMode.LIVE,
      governanceMode: PopulationGovernanceMode.STANDARD,
      nameFR: input.programNameFR,
      nameEN: input.programNameEN,
      registrationEnabled: true,
      smsEnabled: false,
      emailEnabled: true,
    },
  });
}

export async function setupPopulationLiveValidation(
  prisma: PrismaClient,
  rawInput: PopulationLiveSetupInput,
): Promise<PopulationLiveSetupResult> {
  const input = validateInput(rawInput);
  const ids = expectedIds(input.buildingId);

  if (input.dryRun) {
    await validateDatabaseState(prisma, input, ids);
    return resultFor(input, ids);
  }

  await prisma.$transaction(async (tx) => {
    await validateDatabaseState(tx, input, ids);
    await mutate(tx, input, ids);
  });
  return resultFor(input, ids);
}
