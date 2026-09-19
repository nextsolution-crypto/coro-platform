import {
  PopulationDeliveryMode,
  PopulationGovernanceMode,
  PopulationProgramStatus,
  PrismaClient,
  RueAssessmentStatus,
  RueProtectiveAction,
} from '@prisma/client';
import { setupPopulationLiveValidation } from './population-live-setup';

const input = {
  allowSetup: 'true',
  buildingId: 'building-validation-001',
  publicSlug: 'coro-validation',
};

function createPrismaMock() {
  const db = {
    building: {
      findUnique: jest.fn().mockResolvedValue({
        id: input.buildingId,
        clientId: 'client-validation',
        organizationId: 'organization-validation',
        latitude: 45.5,
        longitude: -73.4,
      }),
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
    $transaction: jest.fn(),
  };
  db.$transaction.mockImplementation(async (callback) => callback(db));
  return db;
}

describe('setupPopulationLiveValidation', () => {
  it('refuse avant tout acces DB sans garde explicite', async () => {
    const prisma = createPrismaMock();

    await expect(
      setupPopulationLiveValidation(prisma as unknown as PrismaClient, {
        ...input,
        allowSetup: undefined,
      }),
    ).rejects.toThrow('ALLOW_POPULATION_LIVE_SETUP=true');
    expect(prisma.building.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('valide un dry-run sans transaction ni mutation', async () => {
    const prisma = createPrismaMock();

    const result = await setupPopulationLiveValidation(
      prisma as unknown as PrismaClient,
      { ...input, dryRun: 'true' },
    );

    expect(result).toMatchObject({
      buildingId: input.buildingId,
      publicSlug: input.publicSlug,
      programStatus: PopulationProgramStatus.CONFIGURING,
      deliveryMode: PopulationDeliveryMode.LIVE,
      governanceMode: PopulationGovernanceMode.STANDARD,
      emailEnabled: true,
      smsEnabled: false,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.rueFacilityProfile.upsert).not.toHaveBeenCalled();
    expect(prisma.populationProgram.upsert).not.toHaveBeenCalled();
  });

  it('refuse un batiment inexistant', async () => {
    const prisma = createPrismaMock();
    prisma.building.findUnique.mockResolvedValue(null);

    await expect(
      setupPopulationLiveValidation(prisma as unknown as PrismaClient, input),
    ).rejects.toThrow('Batiment introuvable');
    expect(prisma.rueFacilityProfile.upsert).not.toHaveBeenCalled();
  });

  it.each([
    { ...input, buildingId: 'demo-premont-industrial-001' },
    { ...input, publicSlug: 'premont-boucherville' },
  ])('refuse les ressources Premont', async (protectedInput) => {
    const prisma = createPrismaMock();

    await expect(
      setupPopulationLiveValidation(
        prisma as unknown as PrismaClient,
        protectedInput,
      ),
    ).rejects.toThrow('Premont');
    expect(prisma.building.findUnique).not.toHaveBeenCalled();
  });

  it('refuse une collision de publicSlug avec un autre batiment', async () => {
    const prisma = createPrismaMock();
    prisma.populationProgram.findUnique.mockResolvedValue({
      id: 'different-program',
      status: PopulationProgramStatus.CONFIGURING,
      rueFacilityProfile: { buildingId: 'different-building' },
    });

    await expect(
      setupPopulationLiveValidation(prisma as unknown as PrismaClient, input),
    ).rejects.toThrow('PUBLIC_SLUG appartient deja');
  });

  it('refuse un profil ou programme existant non gere', async () => {
    const prisma = createPrismaMock();
    prisma.rueFacilityProfile.findUnique.mockResolvedValue({
      id: 'existing-profile',
      populationProgram: { id: 'existing-program', publicSlug: 'other' },
    });

    await expect(
      setupPopulationLiveValidation(prisma as unknown as PrismaClient, input),
    ).rejects.toThrow('profil RUE non gere');
  });

  it('cree la configuration complete sans subscriber', async () => {
    const prisma = createPrismaMock();

    const result = await setupPopulationLiveValidation(
      prisma as unknown as PrismaClient,
      input,
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.rueFacilityProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          buildingId: input.buildingId,
          assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
          populationEnabled: true,
        }),
      }),
    );
    expect(prisma.rueEmergencyScenario.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          nameFR: expect.stringContaining('TEST'),
          defaultProtectiveAction: RueProtectiveAction.SHELTER_IN_PLACE,
          validatedAt: expect.any(Date),
          isActive: true,
        }),
      }),
    );
    expect(prisma.rueImpactZone.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          code: 'TEST-ZONE-01',
          maxDistanceKm: 1,
          validatedAt: expect.any(Date),
          isActive: true,
        }),
      }),
    );
    expect(prisma.populationProgram.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          status: PopulationProgramStatus.CONFIGURING,
          deliveryMode: PopulationDeliveryMode.LIVE,
          governanceMode: PopulationGovernanceMode.STANDARD,
          emailEnabled: true,
          smsEnabled: false,
        }),
      }),
    );
    expect(result.programStatus).toBe(PopulationProgramStatus.CONFIGURING);
    expect(Object.keys(prisma)).not.toContain('populationSubscriber');
  });

  it('reutilise les memes IDs et upserts lors de deux executions', async () => {
    const prisma = createPrismaMock();

    const first = await setupPopulationLiveValidation(
      prisma as unknown as PrismaClient,
      input,
    );
    prisma.rueFacilityProfile.findUnique.mockResolvedValue({
      id: first.facilityProfileId,
      assessmentReference: 'CORO_POPULATION_LIVE_VALIDATION_V1',
      populationProgram: {
        id: first.programId,
        publicSlug: input.publicSlug,
      },
    });
    prisma.populationProgram.findUnique.mockResolvedValue({
      id: first.programId,
      status: PopulationProgramStatus.CONFIGURING,
      rueFacilityProfile: { buildingId: input.buildingId },
    });
    prisma.rueEmergencyScenario.findUnique.mockResolvedValue({
      id: first.scenarioId,
      facilityProfileId: first.facilityProfileId,
      sourceReference: 'CORO_POPULATION_LIVE_VALIDATION_V1',
    });
    prisma.rueImpactZone.findUnique.mockResolvedValue({
      id: first.zoneId,
      scenarioId: first.scenarioId,
      sourceReference: 'CORO_POPULATION_LIVE_VALIDATION_V1',
    });

    const second = await setupPopulationLiveValidation(
      prisma as unknown as PrismaClient,
      input,
    );

    expect(second).toEqual(first);
    expect(prisma.rueFacilityProfile.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.populationProgram.upsert).toHaveBeenCalledTimes(2);
  });

  it('propage une erreur transactionnelle sans poursuivre les mutations', async () => {
    const prisma = createPrismaMock();
    prisma.rueEmergencyScenario.upsert.mockRejectedValue(
      new Error('transaction failure'),
    );

    await expect(
      setupPopulationLiveValidation(prisma as unknown as PrismaClient, input),
    ).rejects.toThrow('transaction failure');
    expect(prisma.populationProgram.upsert).not.toHaveBeenCalled();
  });
});
