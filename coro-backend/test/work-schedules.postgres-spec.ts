import { randomUUID } from 'crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { SchedulingService } from '../src/scheduling/scheduling.service';
import { WorkSchedulesService } from '../src/work-schedules/work-schedules.service';
import { scheduleVersionsOverlap } from '../src/work-schedules/work-schedule-time';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;
const slots = [{ dayOfWeek: 1, startTime: 540, endTime: 1020 }];

describePostgres('WorkSchedulesService locking on PostgreSQL', () => {
  const prisma = databaseUrl ? new PrismaService({ datasources: { db: { url: databaseUrl } } }) : new PrismaService();
  const scheduling = new SchedulingService(prisma);
  const service = new WorkSchedulesService(prisma, scheduling);
  const orgId = randomUUID();
  const adminId = randomUUID();
  const actor = { userId: adminId, organizationId: orgId, role: 'ADMIN' };
  const advisor = async () => prisma.user.create({ data: { id: randomUUID(), organizationId: orgId,
    email: `${randomUUID()}@booking-gate.invalid`, password: 'test-only', firstName: 'Schedule', lastName: 'Gate',
    role: 'OPERATOR', timeZone: 'America/Toronto', timeZoneVerified: true } });

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.create({ data: { id: orgId, name: `Schedule gate ${orgId}` } });
    await prisma.user.create({ data: { id: adminId, organizationId: orgId,
      email: `${randomUUID()}@booking-gate.invalid`, password: 'test-only', firstName: 'Admin', lastName: 'Gate',
      role: 'ADMIN', timeZone: 'America/Toronto', timeZoneVerified: true } });
  });
  afterAll(async () => prisma.$disconnect());

  it('creates, replaces, and keeps adjacent versions without overlap', async () => {
    const user = await advisor();
    const first = await service.replace(user.id, { effectiveFrom: '2026-09-01', intervals: slots }, actor);
    expect(first.effectiveUntil).toBeNull();
    const next = await service.replace(user.id, { effectiveFrom: '2026-10-01', intervals: slots }, actor);
    const history = await prisma.userWorkSchedule.findMany({ where: { userId: user.id }, orderBy: { effectiveFrom: 'asc' } });
    expect(history).toHaveLength(2);
    expect(history[0].effectiveUntil?.getTime()).toBe(next.effectiveFrom.getTime());
    expect(history[1].effectiveUntil).toBeNull();
    expect(scheduleVersionsOverlap(history[0], history[1])).toBe(false);
    const before = history[1].effectiveUntil;
    await expect(service.replace(user.id, { effectiveFrom: '2026-09-15', intervals: slots }, actor)).rejects.toThrow();
    const after = await prisma.userWorkSchedule.findMany({ where: { userId: user.id } });
    expect(after).toHaveLength(2);
    expect(after.find(version => version.id === next.id)?.effectiveUntil).toEqual(before);
  });

  it('serializes two real concurrent replacements on the same User', async () => {
    const user = await advisor();
    await service.replace(user.id, { effectiveFrom: '2026-09-01', intervals: slots }, actor);
    const results = await Promise.allSettled([
      service.replace(user.id, { effectiveFrom: '2026-10-01', intervals: slots }, actor),
      service.replace(user.id, { effectiveFrom: '2026-10-01', intervals: slots }, actor),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    const versions = await prisma.userWorkSchedule.findMany({ where: { userId: user.id }, orderBy: { effectiveFrom: 'asc' } });
    expect(versions).toHaveLength(2);
    expect(versions[0].effectiveUntil?.getTime()).toBe(versions[1].effectiveFrom.getTime());
    expect(versions.filter(version => version.effectiveUntil === null)).toHaveLength(1);
    expect(scheduleVersionsOverlap(versions[0], versions[1])).toBe(false);
  });
});
