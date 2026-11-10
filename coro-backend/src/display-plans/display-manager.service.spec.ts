import { ForbiddenException } from '@nestjs/common';
import { DisplayPermission } from '@prisma/client';
import { DisplayManagerService } from './display-manager.service';

describe('DisplayManagerService', () => {
  const actor = { userId: 'user-1', organizationId: 'org-1', role: 'ADMIN' };
  const prisma: any = {
    user: { findFirst: jest.fn() },
    building: { findMany: jest.fn() },
    displayPlanPublication: { findMany: jest.fn() },
    projectFile: { findMany: jest.fn() },
    displayPlanPublicationEvent: { findMany: jest.fn() },
  };
  const service = new DisplayManagerService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('refuse un administrateur sans permission Display explicite', async () => {
    prisma.user.findFirst.mockResolvedValue({
      displayPermissions: [],
      displayBuildingIds: ['building-1'],
    });
    await expect(service.getWorkspace('org-1', actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.building.findMany).not.toHaveBeenCalled();
  });

  it('limite les données aux bâtiments affectés et n’invente aucun appareil', async () => {
    prisma.user.findFirst.mockResolvedValue({
      displayPermissions: [
        DisplayPermission.DISPLAY_READ,
        DisplayPermission.DISPLAY_PLAN_READ,
      ],
      displayBuildingIds: ['building-1'],
    });
    prisma.building.findMany.mockResolvedValue([
      {
        id: 'building-1',
        spatialFloors: [{ displayLocations: [{ id: 'location-1' }] }],
      },
    ]);
    prisma.displayPlanPublication.findMany.mockResolvedValue([
      { id: 'plan-1', status: 'PUBLISHED', locationId: 'location-1' },
    ]);
    const result = await service.getWorkspace('org-1', actor);
    expect(prisma.building.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ['building-1'] } }),
      }),
    );
    expect(result.dashboard.devices).toEqual(
      expect.objectContaining({ available: false, count: null }),
    );
    expect(result.dashboard.anomalyCount).toBe(0);
    expect(prisma.projectFile.findMany).not.toHaveBeenCalled();
    expect(prisma.displayPlanPublicationEvent.findMany).not.toHaveBeenCalled();
  });

  it('ne révèle ni plans ni journaux sans leurs permissions dédiées', async () => {
    prisma.user.findFirst.mockResolvedValue({
      displayPermissions: [DisplayPermission.DISPLAY_READ],
      displayBuildingIds: ['building-1'],
    });
    prisma.building.findMany.mockResolvedValue([]);
    const result = await service.getWorkspace('org-1', actor);
    expect(result.plans).toEqual([]);
    expect(result.recentEvents).toEqual([]);
  });
  it('signale un emplacement suspendu comme non couvert par un plan actif', async () => {
    prisma.user.findFirst.mockResolvedValue({
      displayPermissions: [
        DisplayPermission.DISPLAY_READ,
        DisplayPermission.DISPLAY_PLAN_READ,
      ],
      displayBuildingIds: ['building-1'],
    });
    prisma.building.findMany.mockResolvedValue([
      {
        id: 'building-1',
        spatialFloors: [{ displayLocations: [{ id: 'location-1' }] }],
      },
    ]);
    prisma.displayPlanPublication.findMany.mockResolvedValue([
      { id: 'plan-1', status: 'SUSPENDED', locationId: 'location-1' },
    ]);

    const result = await service.getWorkspace('org-1', actor);

    expect(result.dashboard.anomalyCount).toBe(1);
  });
});
