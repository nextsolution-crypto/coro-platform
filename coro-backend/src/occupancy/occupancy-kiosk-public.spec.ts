import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OccupancyService } from './occupancy.service';

describe('Kiosk public occupancy routes (audit M3-01 / M5-01)', () => {
  function build() {
    const prisma: any = {
      buildingKioskToken: {
        findFirst: jest.fn().mockResolvedValue({ id: 'kiosk-1', buildingId: 'building-1' }),
      },
      building: { findUnique: jest.fn().mockResolvedValue({ organizationId: 'org-1' }) },
      occupancyRecord: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'record-new', type: 'VISITEUR', checkedInAt: new Date() }),
      },
    };
    const service = Object.create(OccupancyService.prototype) as OccupancyService;
    (service as any).prisma = prisma;
    return { service, prisma };
  }

  it('refuses to check out a registered employee from the kiosk token alone', async () => {
    const { service, prisma } = build();
    prisma.occupancyRecord.findUnique.mockResolvedValue({
      id: 'record-employee',
      buildingId: 'building-1',
      status: 'IN',
      employeeId: 'employee-1',
    });

    await expect(
      service.checkOut({ recordId: 'record-employee', kioskToken: 'kiosk-token' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.occupancyRecord.updateMany).not.toHaveBeenCalled();
  });

  it('checks out a manual kiosk entry that is still present, and only once', async () => {
    const { service, prisma } = build();
    prisma.occupancyRecord.findUnique.mockResolvedValue({
      id: 'record-visitor',
      buildingId: 'building-1',
      status: 'IN',
      employeeId: null,
    });
    prisma.occupancyRecord.updateMany.mockResolvedValueOnce({ count: 1 });

    await expect(
      service.checkOut({ recordId: 'record-visitor', kioskToken: 'kiosk-token' }),
    ).resolves.toEqual({ id: 'record-visitor', status: 'OUT' });
    expect(prisma.occupancyRecord.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'record-visitor', status: 'IN', employeeId: null },
        data: expect.objectContaining({ status: 'OUT', checkoutSource: 'KIOSK_MANUAL' }),
      }),
    );

    prisma.occupancyRecord.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      service.checkOut({ recordId: 'record-visitor', kioskToken: 'kiosk-token' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('kiosk search returns manual entries only, without contact details', async () => {
    const { service, prisma } = build();
    prisma.occupancyRecord.findMany.mockResolvedValue([
      {
        id: 'record-visitor',
        type: 'VISITEUR',
        firstName: 'Julie',
        lastName: 'Tremblay',
        checkedInAt: new Date('2026-11-20T14:00:00Z'),
      },
    ]);

    const results = await service.searchOccupantsForCheckout('building-1', 'kiosk-token', 'Jul');

    expect(prisma.occupancyRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ buildingId: 'building-1', status: 'IN', employeeId: null }),
        select: { id: true, type: true, firstName: true, lastName: true, checkedInAt: true },
      }),
    );
    expect(results).toEqual([
      {
        id: 'record-visitor',
        type: 'VISITEUR',
        firstName: 'Julie',
        lastName: 'T.',
        checkedInAt: new Date('2026-11-20T14:00:00Z'),
      },
    ]);
    expect(Object.keys(results[0])).not.toEqual(expect.arrayContaining(['email', 'phone', 'company', 'hostName']));
  });

  it('kiosk search needs at least two characters', async () => {
    const { service, prisma } = build();
    await expect(service.searchOccupantsForCheckout('building-1', 'kiosk-token', 'a')).resolves.toEqual([]);
    expect(prisma.occupancyRecord.findMany).not.toHaveBeenCalled();
  });

  it('manual check-in validates the occupant type and required names', async () => {
    const { service } = build();
    await expect(
      service.checkIn({ buildingId: 'building-1', kioskToken: 'kiosk-token', type: 'ADMIN', firstName: 'A', lastName: 'B' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.checkIn({ buildingId: 'building-1', kioskToken: 'kiosk-token', type: 'VISITEUR', firstName: ' ', lastName: 'B' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.checkIn({ buildingId: 'building-1', kioskToken: 'kiosk-token', type: 'VISITEUR', firstName: 'Julie', lastName: 'Tremblay' }),
    ).resolves.toEqual(expect.objectContaining({ id: 'record-new' }));
  });

  it('no longer exposes public token readers for occupants or history', () => {
    expect((OccupancyService.prototype as any).getCurrentOccupantsPublic).toBeUndefined();
    expect((OccupancyService.prototype as any).getHistoryPublic).toBeUndefined();
  });
});
