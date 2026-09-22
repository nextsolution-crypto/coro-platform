import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ActivityTypesService } from '../src/activity-types/activity-types.service';
import { createBookingFixture } from './booking-postgres-fixture';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('ActivityType PostgreSQL pre-migration gate', () => {
  const prisma = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : new PrismaClient();
  let fixture: Awaited<ReturnType<typeof createBookingFixture>>;
  const suffix = randomUUID().slice(0, 8);

  beforeAll(async () => { await prisma.$connect(); fixture = await createBookingFixture(prisma, true); });
  afterAll(async () => prisma.$disconnect());

  const custom = (organizationId: string, code: string) => prisma.activityType.create({ data: {
    id: randomUUID(), organizationId, code, nameFR: `Type ${suffix}`, visualToken: 'BLUE',
    isSystem: false, displayOrder: 500,
  } });

  it('A rejects a second system type with an existing system code', async () => {
    await expect(prisma.activityType.create({ data: { id: randomUUID(), code: 'autre', nameFR: 'Doublon',
      visualToken: 'NEUTRAL', isSystem: true, displayOrder: 999 } })).rejects.toBeDefined();
  });

  it('B/C enforces tenant uniqueness and allows the same custom code in two organizations', async () => {
    const code = `custom-pg-${suffix}`;
    await custom(fixture.org.id, code);
    await expect(custom(fixture.org.id, code)).rejects.toBeDefined();
    await expect(custom(fixture.otherOrg!.id, code)).resolves.toMatchObject({ code });
  });

  it('prevents an ambiguous custom row from using the system namespace', async () => {
    await expect(custom(fixture.org.id, 'autre')).rejects.toBeDefined();
  });

  it('D enforces the Activity to ActivityType foreign key', async () => {
    await expect(prisma.projectActivity.create({ data: { id: randomUUID(), organizationId: fixture.org.id,
      projectId: fixture.project.id, type: 'legacy', label: 'FK gate', duration: '', activityTypeId: randomUUID(),
    } })).rejects.toBeDefined();
  });

  it('E/F refuses deletion of a used type and preserves its Activity when archived', async () => {
    const type = await custom(fixture.org.id, `custom-used-${suffix}`);
    const activity = await prisma.projectActivity.create({ data: { id: randomUUID(), organizationId: fixture.org.id,
      projectId: fixture.project.id, type: type.code, label: type.nameFR, duration: '', activityTypeId: type.id,
    } });
    await expect(prisma.activityType.delete({ where: { id: type.id } })).rejects.toBeDefined();
    await prisma.activityType.update({ where: { id: type.id }, data: { isActive: false, archivedAt: new Date() } });
    await expect(prisma.projectActivity.findUnique({ where: { id: activity.id } })).resolves.toMatchObject({ activityTypeId: type.id });
  });

  it('G/H backfills exact known codes and leaves an unknown legacy value untouched', async () => {
    const known = await prisma.projectActivity.create({ data: { id: randomUUID(), organizationId: fixture.org.id,
      projectId: fixture.project.id, type: 'exercice_table', label: 'Known', duration: '' } });
    const unknown = await prisma.projectActivity.create({ data: { id: randomUUID(), organizationId: fixture.org.id,
      projectId: fixture.project.id, type: `legacy-${suffix}`, label: 'Unknown', duration: '' } });
    await prisma.$executeRaw`UPDATE "ProjectActivity" AS activity SET "activityTypeId" = catalog."id"
      FROM "ActivityType" AS catalog WHERE catalog."isSystem" = true AND catalog."code" = activity."type"
      AND activity."id" IN (${known.id}, ${unknown.id})`;
    await expect(prisma.projectActivity.findUnique({ where: { id: known.id } })).resolves.toMatchObject({
      type: 'exercice_table', activityTypeId: 'coro-activity-type-exercice-table',
    });
    await expect(prisma.projectActivity.findUnique({ where: { id: unknown.id } })).resolves.toMatchObject({
      type: `legacy-${suffix}`, activityTypeId: null,
    });
  });

  it('I keeps service reads inside the actor tenant plus global system types', async () => {
    const own = await custom(fixture.org.id, `custom-own-${suffix}`);
    const other = await custom(fixture.otherOrg!.id, `custom-other-${suffix}`);
    const service = new ActivityTypesService(prisma as never);
    const rows = await service.list({ userId: fixture.admin.id, organizationId: fixture.org.id, role: 'ADMIN' });
    expect(rows.some(row => row.id === own.id)).toBe(true);
    expect(rows.some(row => row.id === other.id)).toBe(false);
    expect(rows.some(row => row.isSystem)).toBe(true);
  });
});
