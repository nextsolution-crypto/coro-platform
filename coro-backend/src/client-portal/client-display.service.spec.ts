import { ForbiddenException } from '@nestjs/common';
import { DisplayPermission } from '@prisma/client';
import {
  ClientDisplayService,
  type ClientDisplayActor,
} from './client-display.service';

const actor = (
  overrides: Partial<ClientDisplayActor> = {},
): ClientDisplayActor => ({
  sub: 'user-a',
  organizationId: 'org-a',
  clientId: 'client-a',
  buildingIds: ['building-a'],
  displayBuildingIds: ['building-a'],
  displayPermissions: [
    DisplayPermission.DISPLAY_CLIENT_PLAN_READ,
    DisplayPermission.DISPLAY_CLIENT_PREVIEW,
    DisplayPermission.DISPLAY_CLIENT_LOCATION_READ,
    DisplayPermission.DISPLAY_CLIENT_OBSERVATION_SUBMIT,
    DisplayPermission.DISPLAY_CLIENT_OBSERVATION_READ,
  ],
  ...overrides,
});

describe('ClientDisplayService', () => {
  const prisma: any = {
    building: { findMany: jest.fn() },
    buildingFloor: { findMany: jest.fn() },
    displayPlanPublication: { findMany: jest.fn(), findFirst: jest.fn() },
    displayCorrectionObservation: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const storage: any = { downloadPrivate: jest.fn() };
  const service = new ClientDisplayService(prisma, storage);

  beforeEach(() => jest.clearAllMocks());

  it('returns an empty scope when no building is explicitly authorized', async () => {
    await expect(
      service.workspace(actor({ displayBuildingIds: [] }), {}),
    ).resolves.toEqual({
      buildings: [],
      plans: [],
      observations: { submitted: 0, active: 0, closed: 0 },
    });
    expect(prisma.building.findMany).not.toHaveBeenCalled();
  });

  it('refuses a building outside the intersection of portal and Display scopes', async () => {
    await expect(
      service.locations(actor(), 'building-b'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires the dedicated preview permission before private storage access', async () => {
    await expect(
      service.preview(
        actor({
          displayPermissions: [DisplayPermission.DISPLAY_CLIENT_PLAN_READ],
        }),
        'publication-a',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.downloadPrivate).not.toHaveBeenCalled();
  });

  it('only lists observations submitted by the current client user', async () => {
    prisma.displayCorrectionObservation.findMany.mockResolvedValue([]);
    await service.observations(actor());
    expect(prisma.displayCorrectionObservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          submittedByClientUserId: 'user-a',
          organizationId: 'org-a',
          clientId: 'client-a',
        }),
      }),
    );
  });

  it('refuses incomplete normalized coordinates without mutating data', async () => {
    await expect(
      service.submit(actor(), {
        requestId: '00000000-0000-4000-8000-000000000001',
        buildingId: 'building-a',
        publicationId: 'publication-a',
        locationId: 'location-a',
        category: 'OTHER' as any,
        suggestedPriority: 'MINOR' as any,
        description: 'Une description valide.',
        normalizedX: 0.5,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns the existing observation on an idempotent retry', async () => {
    const existing = { id: 'observation-a', reference: 'DSP-EXISTING' };
    prisma.displayCorrectionObservation.findUnique.mockResolvedValue(existing);
    await expect(
      service.submit(actor(), {
        requestId: '00000000-0000-4000-8000-000000000001',
        buildingId: 'building-a',
        publicationId: 'publication-a',
        locationId: 'location-a',
        category: 'OTHER' as any,
        suggestedPriority: 'MINOR' as any,
        description: 'Une description valide.',
      }),
    ).resolves.toBe(existing);
    expect(prisma.displayPlanPublication.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
