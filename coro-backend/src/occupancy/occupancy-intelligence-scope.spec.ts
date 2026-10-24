import { ForbiddenException } from '@nestjs/common';
import { OccupancyService } from './occupancy.service';

describe('OccupancyService Client Portal Intelligence scope', () => {
  const prisma = {
    building: { findMany: jest.fn() },
  };
  const service = new OccupancyService(prisma as any);

  beforeEach(() => jest.clearAllMocks());

  it('narrows CLIENT_MANAGER aggregations by tenant, client and assigned buildings', async () => {
    prisma.building.findMany.mockResolvedValue([
      {
        id: 'building-a',
        name: 'Authorized building',
        kioskToken: null,
      },
    ]);

    const result = await service.getIntelligenceOverview({
      organizationId: 'org-a',
      clientId: 'client-a',
      role: 'CLIENT_MANAGER',
      buildingIds: ['building-a'],
    });

    expect(prisma.building.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-a',
        isActive: true,
        clientId: 'client-a',
        id: { in: ['building-a'] },
      },
      include: { kioskToken: { select: { token: true } } },
    });
    expect(result).toMatchObject({
      organizationId: 'org-a',
      totalBuildings: 1,
      buildings: [expect.objectContaining({ buildingId: 'building-a' })],
    });
  });

  it('preserves the expressly authorized organization view for CLIENT_CORPORATE', async () => {
    prisma.building.findMany.mockResolvedValue([]);

    await service.getIntelligenceOverview({
      organizationId: 'org-a',
      clientId: 'client-a',
      role: 'CLIENT_CORPORATE',
      buildingIds: [],
    });

    expect(prisma.building.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-a', isActive: true },
      include: { kioskToken: { select: { token: true } } },
    });
  });

  it('fails closed for an unknown role before querying any aggregate source', async () => {
    await expect(
      service.getIntelligenceOverview({
        organizationId: 'org-a',
        clientId: 'client-a',
        role: 'CLIENT_VIEWER',
        buildingIds: ['building-a'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.building.findMany).not.toHaveBeenCalled();
  });
});
