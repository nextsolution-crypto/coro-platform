import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { RemindersService } from '../src/reminders/reminders.service';

jest.mock('../src/export/export.service', () => ({
  ExportService: class ExportService {},
}));

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error('TEST_DATABASE_URL est obligatoire pour sentinelle-purge.postgres-spec');
}

// Audit M5-03 : la contrainte EvacuationCheckIn → OccupancyRecord faisait
// échouer toute la purge dès qu'une évacuation avait plus de 12 mois.
describe('Sentinelle nightly purge with retained evacuations (PostgreSQL)', () => {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const suffix = randomUUID();
  const ids = {
    org: `purge-org-${suffix}`,
    client: `purge-client-${suffix}`,
    building: `purge-building-${suffix}`,
    citedRecord: `purge-cited-${suffix}`,
    oldRecord: `purge-old-${suffix}`,
    recentRecord: `purge-recent-${suffix}`,
    ancientRecord: `purge-ancient-${suffix}`,
    evacuation13: `purge-evac13-${suffix}`,
    evacuation37: `purge-evac37-${suffix}`,
  };
  const monthsAgo = (months: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date;
  };

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.create({ data: { id: ids.org, name: 'Purge org', licenseType: 'ENTREPRISE' } });
    await prisma.client.create({ data: { id: ids.client, name: 'Purge client', organizationId: ids.org, regulatoryRequirements: [] } });
    await prisma.building.create({
      data: { id: ids.building, name: 'Purge building', address: '1 Test', city: 'Québec', province: 'QC', clientId: ids.client, organizationId: ids.org },
    });
    const record = (id: string, months: number) => ({
      id,
      buildingId: ids.building,
      organizationId: ids.org,
      type: 'VISITEUR' as const,
      status: 'OUT' as const,
      firstName: 'Test',
      lastName: id,
      checkedInAt: monthsAgo(months),
    });
    await prisma.occupancyRecord.createMany({
      data: [
        record(ids.citedRecord, 13),
        record(ids.oldRecord, 13),
        record(ids.recentRecord, 2),
        record(ids.ancientRecord, 37),
      ],
    });
    await prisma.evacuationEvent.createMany({
      data: [
        { id: ids.evacuation13, buildingId: ids.building, organizationId: ids.org, triggeredAt: monthsAgo(13), snapshot: [], status: 'RESOLVED' },
        { id: ids.evacuation37, buildingId: ids.building, organizationId: ids.org, triggeredAt: monthsAgo(37), snapshot: [], status: 'RESOLVED' },
      ],
    });
    await prisma.evacuationCheckIn.createMany({
      data: [
        { evacuationEventId: ids.evacuation13, occupantRecordId: ids.citedRecord, isAccountedFor: true },
        { evacuationEventId: ids.evacuation37, occupantRecordId: ids.ancientRecord, isAccountedFor: true },
      ],
    });
  });

  afterAll(async () => {
    await prisma.evacuationCheckIn.deleteMany({ where: { evacuationEvent: { buildingId: ids.building } } });
    await prisma.evacuationEvent.deleteMany({ where: { buildingId: ids.building } });
    await prisma.occupancyRecord.deleteMany({ where: { buildingId: ids.building } });
    await prisma.building.deleteMany({ where: { id: ids.building } });
    await prisma.client.deleteMany({ where: { id: ids.client } });
    await prisma.organization.deleteMany({ where: { id: ids.org } });
    await prisma.$disconnect();
  });

  it('keeps evidence of a 13-month evacuation and purges everything past retention', async () => {
    const service = new RemindersService(prisma as any, {} as any);
    const result = await service.purgeOldOccupancyRecords();

    expect(result.failures).toEqual([]);
    const remaining = await prisma.occupancyRecord.findMany({
      where: { buildingId: ids.building },
      select: { id: true },
    });
    expect(remaining.map((r) => r.id).sort()).toEqual([ids.citedRecord, ids.recentRecord].sort());
    const evacuations = await prisma.evacuationEvent.findMany({
      where: { buildingId: ids.building },
      select: { id: true },
    });
    expect(evacuations.map((e) => e.id)).toEqual([ids.evacuation13]);
    await expect(
      prisma.evacuationCheckIn.count({ where: { evacuationEventId: ids.evacuation13 } }),
    ).resolves.toBe(1);
  });
});
