import {
  PopulationConsentEventType,
  PopulationPreferredLanguage,
  PopulationSubscriberStatus,
  PrismaClient,
} from '@prisma/client';

const prisma = new PrismaClient();

const PROFILE_ID = 'demo-premont-rue-profile-001';
const BUILDING_ID = 'demo-premont-industrial-001';
const SCENARIO_ID = 'demo-premont-scenario-001';
const ZONE_ID = 'demo-premont-zone-a-001';
const CONSENT_SOURCE = 'DEMO_FIXTURE_LOT_4A_3A';
const VERIFIED_AT = new Date('2026-09-18T12:00:00.000Z');

const SUBSCRIBER_IDS = [
  'demo-premont-population-subscriber-a',
  'demo-premont-population-subscriber-b',
  'demo-premont-population-subscriber-c',
] as const;

// Synthetic validation points. They do not represent real residences.
const DEMO_SUBSCRIBERS = [
  {
    id: SUBSCRIBER_IDS[0],
    firstName: 'Demo-A',
    lastName: 'Fictif-Interieur',
    phone: '+12025550111',
    email: 'coro-demo-premont-a@example.invalid',
    latitude: 45.56821528326056,
    longitude: -73.40845800055679,
    locationSource: 'DEMO_SYNTHETIC_POINT_0_334_KM',
  },
  {
    id: SUBSCRIBER_IDS[1],
    firstName: 'Demo-B',
    lastName: 'Fictif-Exterieur',
    phone: '+12025550112',
    email: 'coro-demo-premont-b@example.invalid',
    latitude: 45.58521528326056,
    longitude: -73.40845800055679,
    locationSource: 'DEMO_SYNTHETIC_POINT_2_224_KM',
  },
  {
    id: SUBSCRIBER_IDS[2],
    firstName: 'Demo-C',
    lastName: 'Fictif-Sans-Coordonnees',
    phone: '+12025550113',
    email: 'coro-demo-premont-c@example.invalid',
    latitude: null,
    longitude: null,
    locationSource: null,
  },
] as const;

function assertDemoFixtureEnabled() {
  if (process.env.CORO_ALLOW_DEMO_FIXTURES !== 'true') {
    throw new Error(
      'Fixture bloquee. Definir CORO_ALLOW_DEMO_FIXTURES=true explicitement.',
    );
  }
}

async function resolveFixtureContext() {
  const profile = await prisma.rueFacilityProfile.findUnique({
    where: { id: PROFILE_ID },
    select: { buildingId: true },
  });

  if (!profile || profile.buildingId !== BUILDING_ID) {
    throw new Error('Profil RUE DEMO Premont introuvable ou incoherent.');
  }

  const program = await prisma.populationProgram.findUnique({
    where: { rueFacilityProfileId: PROFILE_ID },
  });
  if (!program?.consentVersion) {
    throw new Error('Programme Population ou consentVersion introuvable.');
  }

  const building = await prisma.building.findUnique({
    where: { id: BUILDING_ID },
    select: { latitude: true, longitude: true },
  });

  if (
    building?.latitude !== 45.56521528326056 ||
    building.longitude !== -73.40845800055679
  ) {
    throw new Error('Coordonnees du site DEMO Premont inattendues.');
  }

  const scenario = await prisma.rueEmergencyScenario.findFirst({
    where: { id: SCENARIO_ID, facilityProfileId: PROFILE_ID },
    include: { impactZones: { where: { id: ZONE_ID } } },
  });
  const zone = scenario?.impactZones[0];

  if (!zone || zone.geometry !== null || zone.maxDistanceKm !== 1) {
    throw new Error('Scenario ou ZONE-A DEMO Premont inattendu.');
  }

  return program;
}

async function cleanup() {
  const deliveryCount = await prisma.populationAlertDelivery.count({
    where: { subscriberId: { in: [...SUBSCRIBER_IDS] } },
  });

  if (deliveryCount > 0) {
    throw new Error(
      'Cleanup refuse: des livraisons historiques referencent la fixture.',
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.populationConsentEvent.deleteMany({
      where: {
        subscriberId: { in: [...SUBSCRIBER_IDS] },
        source: CONSENT_SOURCE,
      },
    });
    await tx.populationSubscriber.deleteMany({
      where: { id: { in: [...SUBSCRIBER_IDS] } },
    });
  });

  console.log('Fixture DEMO Population Premont supprimee.');
}

async function seed() {
  const program = await resolveFixtureContext();

  await prisma.$transaction(async (tx) => {
    for (const demo of DEMO_SUBSCRIBERS) {
      const data = {
        programId: program.id,
        status: PopulationSubscriberStatus.ACTIVE,
        preferredLanguage: PopulationPreferredLanguage.FR,
        firstName: demo.firstName,
        lastName: demo.lastName,
        phone: demo.phone,
        email: demo.email,
        smsEnabled: true,
        emailEnabled: true,
        latitude: demo.latitude,
        longitude: demo.longitude,
        locationSource: demo.locationSource,
        locationResolvedAt: demo.latitude === null ? null : VERIFIED_AT,
        verifiedAt: VERIFIED_AT,
        unsubscribedAt: null,
      };

      await tx.populationSubscriber.upsert({
        where: { id: demo.id },
        update: data,
        create: { id: demo.id, ...data },
      });
    }

    await tx.populationConsentEvent.deleteMany({
      where: {
        subscriberId: { in: [...SUBSCRIBER_IDS] },
        source: CONSENT_SOURCE,
      },
    });

    await tx.populationConsentEvent.createMany({
      data: DEMO_SUBSCRIBERS.flatMap((demo) =>
        [
          PopulationConsentEventType.SUBSCRIBED,
          PopulationConsentEventType.VERIFIED,
        ].map((type) => ({
          programId: program.id,
          subscriberId: demo.id,
          type,
          consentVersion: program.consentVersion!,
          smsEnabled: true,
          emailEnabled: true,
          source: CONSENT_SOURCE,
          occurredAt: VERIFIED_AT,
        })),
      ),
    });
  });

  console.warn(
    'ATTENTION: destinations synthetiques DEMO. Ne pas declencher un envoi reel.',
  );
  console.log('Fixture DEMO Population Premont creee ou mise a jour.');
}

async function main() {
  assertDemoFixtureEnabled();

  if (process.argv.includes('--cleanup')) {
    await cleanup();
    return;
  }

  await seed();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
