/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SpatialService } from './spatial.service';

describe('SpatialService', () => {
  const actor = { userId: 'user-a', organizationId: 'org-a', role: 'ADMIN' };
  let tx: any;
  let prisma: any;
  let authorization: any;
  let audit: any;
  let service: SpatialService;

  beforeEach(() => {
    const delegates = () => ({
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    });
    tx = {
      $executeRaw: jest.fn(),
      building: delegates(),
      buildingFloor: delegates(),
      buildingZone: delegates(),
      displayLocation: delegates(),
    };
    prisma = {
      ...tx,
      $transaction: jest.fn((action) =>
        Array.isArray(action) ? Promise.all(action) : action(tx),
      ),
    };
    authorization = { require: jest.fn().mockResolvedValue(undefined) };
    audit = { record: jest.fn().mockResolvedValue({ id: 'audit-a' }) };
    service = new SpatialService(prisma, authorization, audit);
    tx.building.findFirst.mockResolvedValue({
      id: 'building-a',
      isActive: true,
    });
  });

  it('creates a floor in the route tenant and audits it atomically', async () => {
    tx.buildingFloor.create.mockResolvedValue({
      id: 'floor-a',
      organizationId: 'org-a',
      buildingId: 'building-a',
      code: 'RDC',
      name: 'Rez-de-chaussée',
    });
    await expect(
      service.createFloor(
        'org-a',
        'building-a',
        { code: 'rdc', name: ' Rez-de-chaussée ' },
        actor,
      ),
    ).resolves.toMatchObject({ id: 'floor-a', code: 'RDC' });
    expect(tx.buildingFloor.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-a',
        buildingId: 'building-a',
        code: 'RDC',
      }),
    });
    expect(audit.record).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: 'BUILDING_FLOOR_CREATED',
        organizationId: 'org-a',
        actorUserId: 'user-a',
      }),
    );
  });

  it('does not enumerate a building from another tenant', async () => {
    tx.building.findFirst.mockResolvedValue(null);
    await expect(
      service.createFloor(
        'org-a',
        'foreign-building',
        { code: 'RDC', name: 'RDC' },
        actor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.buildingFloor.create).not.toHaveBeenCalled();
  });

  it('paginates deterministic floor lists and reports the complete count', async () => {
    tx.buildingFloor.findMany.mockResolvedValue([{ id: 'floor-b' }]);
    tx.buildingFloor.count.mockResolvedValue(62);

    await expect(
      service.listFloors('org-a', 'building-a', actor, {
        offset: 50,
        limit: 25,
      }),
    ).resolves.toEqual({
      items: [{ id: 'floor-b' }],
      total: 62,
      offset: 50,
      limit: 25,
    });
    expect(tx.buildingFloor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 50,
        take: 25,
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('rejects a zone whose floor does not belong to the route hierarchy', async () => {
    tx.buildingFloor.findFirst.mockResolvedValue(null);
    await expect(
      service.createZone(
        'org-a',
        'building-a',
        'foreign-floor',
        { code: 'A', name: 'Zone A' },
        actor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.buildingZone.create).not.toHaveBeenCalled();
  });

  it('keeps inactive floors read-only', async () => {
    tx.buildingFloor.findFirst.mockResolvedValue({
      id: 'floor-a',
      status: 'INACTIVE',
    });
    await expect(
      service.createZone(
        'org-a',
        'building-a',
        'floor-a',
        { code: 'A', name: 'Zone A' },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.buildingZone.create).not.toHaveBeenCalled();
  });

  it('rejects a location whose zone is attached to another floor', async () => {
    tx.buildingFloor.findFirst.mockResolvedValue({
      id: 'floor-a',
      status: 'ACTIVE',
    });
    tx.buildingZone.findFirst.mockResolvedValue(null);
    await expect(
      service.createLocation(
        'org-a',
        'building-a',
        {
          floorId: 'floor-a',
          zoneId: 'foreign-zone',
          code: 'L1',
          label: 'Écran 1',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.displayLocation.create).not.toHaveBeenCalled();
  });

  it('rejects stale concurrent mutations without an audit success event', async () => {
    tx.buildingFloor.findFirst.mockResolvedValue({
      id: 'floor-a',
      organizationId: 'org-a',
      buildingId: 'building-a',
      code: 'RDC',
      name: 'RDC',
      status: 'ACTIVE',
      lockVersion: 2,
    });
    tx.buildingFloor.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.updateFloor(
        'org-a',
        'building-a',
        'floor-a',
        { name: 'Nouveau', expectedLockVersion: 1 },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('refuses to archive a floor while non-archived children remain', async () => {
    tx.buildingFloor.findFirst.mockResolvedValue({
      id: 'floor-a',
      name: 'RDC',
      status: 'ACTIVE',
      lockVersion: 0,
    });
    tx.buildingZone.count.mockResolvedValue(1);
    tx.displayLocation.count.mockResolvedValue(0);
    await expect(
      service.archiveFloor(
        'org-a',
        'building-a',
        'floor-a',
        { expectedLockVersion: 0 },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.buildingFloor.updateMany).not.toHaveBeenCalled();
  });
});
