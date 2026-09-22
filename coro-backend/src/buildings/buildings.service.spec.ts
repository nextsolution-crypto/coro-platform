import { BadRequestException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BuildingsService } from './buildings.service';

describe('BuildingsService timezone verification', () => {
  const input = { name: 'Building', address: '1 Main', city: 'Toronto', province: 'ON', clientId: 'client', organizationId: 'org' };
  let prisma: any;
  let service: BuildingsService;

  beforeEach(() => {
    prisma = { building: {
      create: jest.fn().mockResolvedValue({ id: 'building' }),
      findFirst: jest.fn().mockResolvedValue({ id: 'building' }),
      findUnique: jest.fn().mockResolvedValue({ id: 'building' }),
      update: jest.fn().mockResolvedValue({ id: 'building' }),
    } };
    service = new BuildingsService(prisma, {} as any);
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
  });

  afterEach(() => jest.restoreAllMocks());

  it('migrates existing buildings to an unverified compatibility timezone', () => {
    const sql = readFileSync(resolve(__dirname, '../../prisma/migrations/20260921235500_building_time_zone/migration.sql'), 'utf8');
    expect(sql).toContain('"timeZone" TEXT NOT NULL DEFAULT \'America/Toronto\'');
    expect(sql).toContain('"timeZoneVerified" BOOLEAN NOT NULL DEFAULT false');
  });

  it('verifies an explicitly supplied valid timezone at creation', async () => {
    await service.create({ ...input, timeZone: 'America/Vancouver', timeZoneVerified: false } as any);
    expect(prisma.building.create).toHaveBeenCalledWith({ data: expect.objectContaining({ timeZone: 'America/Vancouver', timeZoneVerified: true }) });
  });

  it('leaves an implicit default unverified and ignores a forged verification flag', async () => {
    await service.create({ ...input, timeZoneVerified: true } as any);
    expect(prisma.building.create).toHaveBeenCalledWith({ data: expect.objectContaining({ timeZoneVerified: false }) });
  });

  it('verifies a valid timezone on update', async () => {
    await service.update('building', { timeZone: 'America/Halifax' }, 'org');
    expect(prisma.building.update).toHaveBeenCalledWith({ where: { id: 'building' }, data: { timeZone: 'America/Halifax', timeZoneVerified: true } });
  });

  it('ignores a forged verification flag without a timezone change', async () => {
    await service.update('building', { timeZoneVerified: true }, 'org');
    expect(prisma.building.update).toHaveBeenCalledWith({ where: { id: 'building' }, data: {} });
  });

  it('rejects invalid timezone at creation and update', async () => {
    await expect(service.create({ ...input, timeZone: 'Mars/Olympus' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update('building', { timeZone: 'Mars/Olympus', timeZoneVerified: true }, 'org')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.building.create).not.toHaveBeenCalled();
    expect(prisma.building.update).not.toHaveBeenCalled();
  });
});
