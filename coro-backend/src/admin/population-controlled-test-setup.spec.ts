import {
  PopulationDeliveryMode,
  PopulationGovernanceMode,
  PopulationProgramStatus,
  PrismaClient,
} from '@prisma/client';
import {
  CONTROLLED_TEST_BUILDING_ID,
  CONTROLLED_TEST_ENVIRONMENT,
  CONTROLLED_TEST_ORGANIZATION_ID,
  CONTROLLED_TEST_PUBLIC_SLUG,
  setupPopulationControlledTest,
} from './population-controlled-test-setup';

const input = {
  allowSetup: 'true',
  environment: CONTROLLED_TEST_ENVIRONMENT,
  organizationId: CONTROLLED_TEST_ORGANIZATION_ID,
  clientId: 'client-demo-authorized',
  allowedClientId: 'client-demo-authorized',
  buildingId: CONTROLLED_TEST_BUILDING_ID,
  publicSlug: CONTROLLED_TEST_PUBLIC_SLUG,
  actorUserId: 'admin-demo-authorized',
};

function harness() {
  const tx: any = {
    organization: {
      findUnique: jest.fn().mockResolvedValue({
        id: CONTROLLED_TEST_ORGANIZATION_ID,
        isActive: true,
        isInternal: false,
      }),
    },
    client: {
      findUnique: jest.fn().mockResolvedValue({
        id: input.clientId,
        organizationId: CONTROLLED_TEST_ORGANIZATION_ID,
        isActive: true,
      }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: input.actorUserId,
        organizationId: CONTROLLED_TEST_ORGANIZATION_ID,
        isActive: true,
        role: 'ADMIN',
      }),
    },
    building: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    rueFacilityProfile: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    populationProgram: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    rueEmergencyScenario: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    rueImpactZone: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    auditLog: { upsert: jest.fn().mockResolvedValue({}) },
    $executeRaw: jest.fn().mockResolvedValue(1),
  };
  const prisma: any = {
    ...tx,
    $transaction: jest.fn(async (callback: any) => callback(tx)),
  };
  return { prisma, tx };
}

describe('setupPopulationControlledTest', () => {
  it.each([
    ['garde', { allowSetup: undefined }],
    ['environnement', { environment: 'PRODUCTION' }],
    ['organisation', { organizationId: 'other-org' }],
    ['client', { allowedClientId: 'other-client' }],
    ['batiment', { buildingId: 'other-building' }],
    ['slug', { publicSlug: 'other-slug' }],
    ['acteur', { actorUserId: undefined }],
  ])('refuse %s avant toute mutation', async (_label, override) => {
    const h = harness();
    await expect(
      setupPopulationControlledTest(h.prisma as PrismaClient, {
        ...input,
        ...override,
      }),
    ).rejects.toThrow();
    expect(h.prisma.$transaction).not.toHaveBeenCalled();
    expect(h.tx.building.upsert).not.toHaveBeenCalled();
  });

  it('dry-run valide les autorites sans mutation', async () => {
    const h = harness();
    const result = await setupPopulationControlledTest(
      h.prisma as PrismaClient,
      { ...input, dryRun: 'true' },
    );
    expect(result).toMatchObject({
      dryRun: true,
      organizationId: CONTROLLED_TEST_ORGANIZATION_ID,
      buildingId: CONTROLLED_TEST_BUILDING_ID,
      publicSlug: CONTROLLED_TEST_PUBLIC_SLUG,
      programStatus: PopulationProgramStatus.CONFIGURING,
      deliveryMode: PopulationDeliveryMode.SANDBOX,
      governanceMode: PopulationGovernanceMode.DUAL_CONTROL,
      subscriberCount: 0,
    });
    expect(h.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuse une organisation inactive, un client hors tenant et les collisions', async () => {
    const inactive = harness();
    inactive.prisma.organization.findUnique.mockResolvedValue({
      id: CONTROLLED_TEST_ORGANIZATION_ID,
      isActive: false,
      isInternal: false,
    });
    await expect(
      setupPopulationControlledTest(inactive.prisma as PrismaClient, input),
    ).rejects.toThrow('Organisation Demo');

    const outside = harness();
    outside.prisma.client.findUnique.mockResolvedValue({
      id: input.clientId,
      organizationId: 'other-org',
      isActive: true,
    });
    await expect(
      setupPopulationControlledTest(outside.prisma as PrismaClient, input),
    ).rejects.toThrow('hors organisation');

    const unauthorizedActor = harness();
    unauthorizedActor.prisma.user.findUnique.mockResolvedValue({
      id: input.actorUserId,
      organizationId: CONTROLLED_TEST_ORGANIZATION_ID,
      isActive: true,
      role: 'OPERATOR',
    });
    await expect(
      setupPopulationControlledTest(
        unauthorizedActor.prisma as PrismaClient,
        input,
      ),
    ).rejects.toThrow('non habilite');

    const collision = harness();
    collision.prisma.building.findUnique.mockResolvedValue({
      id: CONTROLLED_TEST_BUILDING_ID,
      organizationId: CONTROLLED_TEST_ORGANIZATION_ID,
      clientId: input.clientId,
      name: 'Batiment reel',
      buildingType: 'OFFICE',
      rueFacilityProfile: null,
    });
    await expect(
      setupPopulationControlledTest(collision.prisma as PrismaClient, input),
    ).rejects.toThrow('batiment existant non gere');
  });

  it('provisionne atomiquement SANDBOX DUAL_CONTROL sans destinataire', async () => {
    const h = harness();
    const result = await setupPopulationControlledTest(
      h.prisma as PrismaClient,
      input,
    );
    expect(h.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(h.tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(h.tx.building.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          id: CONTROLLED_TEST_BUILDING_ID,
          organizationId: CONTROLLED_TEST_ORGANIZATION_ID,
          clientId: input.clientId,
          buildingType: 'QA_FICTITIOUS_SENTINELLE_POPULATION',
        }),
        update: {},
      }),
    );
    expect(h.tx.populationProgram.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          status: PopulationProgramStatus.CONFIGURING,
          deliveryMode: PopulationDeliveryMode.SANDBOX,
          governanceMode: PopulationGovernanceMode.DUAL_CONTROL,
          registrationEnabled: false,
          smsEnabled: false,
          emailEnabled: false,
        }),
        update: {},
      }),
    );
    expect(h.tx.auditLog.upsert).toHaveBeenCalledTimes(1);
    expect(result.subscriberCount).toBe(0);
  });

  it('reste idempotent et refuse de reprendre un programme modifie', async () => {
    const h = harness();
    const first = await setupPopulationControlledTest(
      h.prisma as PrismaClient,
      input,
    );
    h.prisma.building.findUnique.mockResolvedValue({
      id: first.buildingId,
      organizationId: first.organizationId,
      clientId: first.clientId,
      name: 'Usine Demo Nord - SP-OPS-04B',
      buildingType: 'QA_FICTITIOUS_SENTINELLE_POPULATION',
      rueFacilityProfile: {
        id: first.facilityProfileId,
        assessmentReference: 'CORO_SP_OPS_04B_CONTROLLED_TEST_V1',
        populationProgram: {
          id: first.programId,
          publicSlug: first.publicSlug,
          status: PopulationProgramStatus.CONFIGURING,
          deliveryMode: PopulationDeliveryMode.SANDBOX,
          governanceMode: PopulationGovernanceMode.DUAL_CONTROL,
        },
      },
    });
    h.prisma.rueFacilityProfile.findUnique.mockResolvedValue({
      id: first.facilityProfileId,
      buildingId: first.buildingId,
      assessmentReference: 'CORO_SP_OPS_04B_CONTROLLED_TEST_V1',
    });
    h.prisma.populationProgram.findUnique.mockResolvedValue({
      id: first.programId,
      rueFacilityProfileId: first.facilityProfileId,
    });
    const second = await setupPopulationControlledTest(
      h.prisma as PrismaClient,
      input,
    );
    expect(second).toEqual(first);

    h.prisma.building.findUnique.mockResolvedValue({
      ...(await h.prisma.building.findUnique()),
      rueFacilityProfile: {
        ...(await h.prisma.building.findUnique()).rueFacilityProfile,
        populationProgram: {
          ...(await h.prisma.building.findUnique()).rueFacilityProfile
            .populationProgram,
          deliveryMode: PopulationDeliveryMode.LIVE,
        },
      },
    });
    await expect(
      setupPopulationControlledTest(h.prisma as PrismaClient, input),
    ).rejects.toThrow('programme Population non gere');
  });
});
