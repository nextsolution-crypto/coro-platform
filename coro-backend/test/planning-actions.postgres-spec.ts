import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createBookingFixture } from './booking-postgres-fixture';
import { SchedulingService } from '../src/scheduling/scheduling.service';
import { PlanningActionsService } from '../src/planning/planning-actions.service';
import { PlanningService } from '../src/planning/planning.service';
import { BookingsService } from '../src/bookings/bookings.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Planner mutations on PostgreSQL', () => {
  const prisma = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : new PrismaClient();
  let fixture: Awaited<ReturnType<typeof createBookingFixture>>;
  let service: PlanningActionsService;

  beforeAll(async () => {
    await prisma.$connect();
    fixture = await createBookingFixture(prisma, true);
    service = new PlanningActionsService(prisma as any, new SchedulingService(prisma as any));
  });
  afterAll(async () => prisma.$disconnect());

  const activity = (clientBookable = false) => prisma.projectActivity.create({ data: {
    organizationId: fixture.org.id, projectId: fixture.project.id, type: 'inspection', label: 'Gate Planner',
    duration: '1h00', status: 'a_faire', sourceMandate: true, clientVisible: true, clientBookable,
  } });
  const actor = () => ({ userId: fixture.admin.id, organizationId: fixture.org.id, role: 'ADMIN' });
  const input = () => ({ startUtc: '2026-10-08T14:00:00.000Z', durationMinutes: 60,
    leadUserId: fixture.owner.id, supportUserIds: [fixture.colleague.id], confirmUnknown: true });
  const backlog = () => new PlanningService(prisma as any, new SchedulingService(prisma as any), {
    getCapacityPlanning: jest.fn().mockResolvedValue([]),
  } as any).actions({ start: '2026-10-01T04:00:00.000Z', end: '2026-10-31T04:00:00.000Z',
    type: 'UNPLANNED_ACTIVITY' }, actor());

  it('commits Activity, Booking, assignments and audit together and preserves the Project chain', async () => {
    const source = await activity();
    const result = await service.planExisting(source.id, input(), actor());
    const persisted = await prisma.projectActivity.findUniqueOrThrow({ where: { id: source.id }, include: {
      project: { include: { client: true, building: true, organization: true } },
      bookings: { include: { assignments: { include: { user: true } } } },
    } });
    expect(result.activityId).toBe(source.id);
    expect(persisted.bookings).toHaveLength(1);
    expect(persisted.bookings[0].assignments).toHaveLength(2);
    expect(persisted.project.organizationId).toBe(fixture.org.id);
    expect(await prisma.auditLog.count({ where: { entityId: source.id, action: 'PLANNED' } })).toBe(1);
  });

  it('rolls back an invalid assignment and serializes two plans of the same Activity', async () => {
    const invalid = await activity();
    await expect(service.planExisting(invalid.id, { ...input(), leadUserId: fixture.outsider!.id }, actor())).rejects.toBeDefined();
    expect(await prisma.booking.count({ where: { activityId: invalid.id } })).toBe(0);

    const concurrent = await activity();
    const attempts = await Promise.allSettled([
      service.planExisting(concurrent.id, input(), actor()),
      service.planExisting(concurrent.id, input(), actor()),
    ]);
    expect(attempts.filter(item => item.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.filter(item => item.status === 'rejected')).toHaveLength(1);
    expect(await prisma.booking.count({ where: { activityId: concurrent.id,
      status: { in: ['DEMANDEE', 'CONFIRMEE', 'REPORTEE', 'REASSIGNEE'] } } })).toBe(1);
    const booking = await prisma.booking.findFirstOrThrow({ where: { activityId: concurrent.id } });
    expect(await prisma.bookingAssignment.count({ where: { bookingId: booking.id, role: 'LEAD',
      status: { in: ['PENDING', 'ACCEPTED'] } } })).toBe(1);
  });

  it('cancels the Booking, returns the same Activity to backlog, then creates a new attempt', async () => {
    const source = await activity();
    const first = await service.planExisting(source.id, input(), actor());
    await service.cancelSchedule(first.bookingId, actor());
    expect(await prisma.booking.findUniqueOrThrow({ where: { id: first.bookingId } })).toMatchObject({ status: 'ANNULEE' });
    expect(await prisma.projectActivity.findUniqueOrThrow({ where: { id: source.id } })).toMatchObject({ id: source.id, scheduledDate: null });
    const second = await service.planExisting(source.id, { ...input(), startUtc: '2026-10-09T14:00:00.000Z' }, actor());
    expect(second.activityId).toBe(source.id);
    expect(second.bookingId).not.toBe(first.bookingId);
    expect(await prisma.booking.count({ where: { activityId: source.id } })).toBe(2);
  });

  it('serializes Planner against the existing Booking path for the same Activity', async () => {
    const source = await activity(true);
    const bookings = new BookingsService(prisma as any, new SchedulingService(prisma as any));
    jest.spyOn(bookings as any, 'sendBookingEmail').mockResolvedValue(undefined);
    const attempts = await Promise.allSettled([
      service.planExisting(source.id, input(), actor()),
      bookings.createBooking({ projectId: fixture.project.id, activityId: source.id,
        clientUserId: fixture.clientUser.id, activityType: source.type,
        requestedDate: new Date('2026-10-08T15:00:00.000Z'), duration: 60 }),
    ]);
    expect(attempts.filter(item => item.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.filter(item => item.status === 'rejected')).toHaveLength(1);
    expect(await prisma.booking.count({ where: { activityId: source.id,
      status: { in: ['DEMANDEE', 'CONFIRMEE', 'REPORTEE', 'REASSIGNEE'] } } })).toBe(1);
  });

  it('rolls back the Booking when Assignment persistence fails', async () => {
    const source = await activity();
    await expect(service.planExisting(source.id, input(), {
      ...actor(), userId: randomUUID(),
    })).rejects.toBeDefined();
    expect(await prisma.booking.count({ where: { activityId: source.id } })).toBe(0);
    expect(await prisma.projectActivity.findUniqueOrThrow({ where: { id: source.id } }))
      .toMatchObject({ scheduledDate: null });
  });

  it('keeps one active LEAD under concurrent inserts', async () => {
    const booking = await fixture.createBooking();
    const attempts = await Promise.allSettled([
      prisma.bookingAssignment.create({ data: { bookingId: booking.id, userId: fixture.owner.id,
        role: 'LEAD', status: 'PENDING' } }),
      prisma.bookingAssignment.create({ data: { bookingId: booking.id, userId: fixture.colleague.id,
        role: 'LEAD', status: 'ACCEPTED' } }),
    ]);
    expect(attempts.filter(item => item.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.filter(item => item.status === 'rejected')).toHaveLength(1);
    expect(await prisma.bookingAssignment.count({ where: { bookingId: booking.id, role: 'LEAD',
      status: { in: ['PENDING', 'ACCEPTED'] } } })).toBe(1);
  });

  it('preserves the reported slot and projects the replacement LEAD after reassignment', async () => {
    const source = await activity();
    const planned = await service.planExisting(source.id, { ...input(),
      startUtc: '2026-09-23T17:45:00.000Z', durationMinutes: 90, supportUserIds: [] }, actor());
    const original = await prisma.booking.findUniqueOrThrow({ where: { id: planned.bookingId } });
    const oldLead = await prisma.bookingAssignment.findFirstOrThrow({ where: {
      bookingId: planned.bookingId, role: 'LEAD', status: 'PENDING', userId: fixture.owner.id,
    } });
    await service.updateSlot(planned.bookingId, { startUtc: '2026-09-24T17:45:00.000Z',
      durationMinutes: 90, reschedule: true, confirmUnknown: true }, actor());
    await service.reassign(planned.bookingId, { leadUserId: fixture.target.id,
      supportUserIds: [], confirmUnknown: true }, actor());

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: planned.bookingId } });
    const historical = await prisma.bookingAssignment.findUniqueOrThrow({ where: { id: oldLead.id } });
    const replacement = await prisma.bookingAssignment.findUniqueOrThrow({ where: {
      id: historical.replacedByAssignmentId!,
    } });
    expect(booking).toMatchObject({ id: original.id, activityId: source.id,
      requestedDate: new Date('2026-09-23T17:45:00.000Z'),
      reportedDate: new Date('2026-09-24T17:45:00.000Z'), duration: 90,
      status: 'REASSIGNEE', assignedUserId: fixture.target.id });
    expect(await prisma.booking.count({ where: { activityId: source.id,
      status: { in: ['DEMANDEE', 'CONFIRMEE', 'REPORTEE', 'REASSIGNEE'] } } })).toBe(1);
    expect(historical).toMatchObject({ status: 'REPLACED', replacedByAssignmentId: replacement.id });
    expect(replacement).toMatchObject({ bookingId: planned.bookingId, userId: fixture.target.id,
      role: 'LEAD', status: 'PENDING' });

    const projection = new PlanningService(prisma as any, new SchedulingService(prisma as any), {
      getCapacityPlanning: jest.fn().mockResolvedValue([]),
    } as any);
    const snapshot = await projection.team({ start: '2026-09-23T04:00:00.000Z',
      end: '2026-09-26T04:00:00.000Z' }, actor());
    expect(snapshot.events.find((event: any) => event.bookingId === planned.bookingId)).toMatchObject({
      activityId: source.id, startUtc: new Date('2026-09-24T17:45:00.000Z'),
      endUtc: new Date('2026-09-24T19:15:00.000Z'), bookingStatus: 'REASSIGNEE',
      userIds: [fixture.target.id], assignments: [{ userId: fixture.target.id, role: 'LEAD', status: 'PENDING' }],
    });
  });

  it('links replaced LEAD history and rejects a cross-tenant Activity', async () => {
    const source = await activity();
    const planned = await service.planExisting(source.id, input(), actor());
    const previous = await prisma.bookingAssignment.findFirstOrThrow({ where: {
      bookingId: planned.bookingId, role: 'LEAD', status: 'PENDING',
    } });
    const previousSupport = await prisma.bookingAssignment.findFirstOrThrow({ where: {
      bookingId: planned.bookingId, role: 'SUPPORT', status: 'PENDING', userId: fixture.colleague.id,
    } });
    await service.reassign(planned.bookingId, { leadUserId: fixture.target.id,
      supportUserIds: [fixture.colleague.id], confirmUnknown: true }, actor());
    const historical = await prisma.bookingAssignment.findUniqueOrThrow({ where: { id: previous.id } });
    const replacement = await prisma.bookingAssignment.findUniqueOrThrow({ where: {
      id: historical.replacedByAssignmentId!,
    } });
    expect(historical.status).toBe('REPLACED');
    expect(replacement).toMatchObject({ bookingId: planned.bookingId, userId: fixture.target.id,
      role: 'LEAD', status: 'PENDING' });
    const historicalSupport = await prisma.bookingAssignment.findUniqueOrThrow({ where: { id: previousSupport.id } });
    const replacementSupport = await prisma.bookingAssignment.findUniqueOrThrow({ where: {
      id: historicalSupport.replacedByAssignmentId!,
    } });
    expect(historicalSupport.status).toBe('REPLACED');
    expect(replacementSupport).toMatchObject({ bookingId: planned.bookingId, userId: fixture.colleague.id,
      role: 'SUPPORT', status: 'PENDING' });
    await expect(service.planExisting(source.id, input(), {
      userId: fixture.outsider!.id, organizationId: fixture.otherOrg!.id, role: 'ADMIN',
    })).rejects.toBeDefined();
    expect(await prisma.booking.count({ where: { activityId: source.id,
      status: { in: ['DEMANDEE', 'CONFIRMEE', 'REPORTEE', 'REASSIGNEE'] } } })).toBe(1);
  });

  it('cancels an Activity with terminal history while preserving its Booking and Assignments', async () => {
    const source = await activity();
    const planned = await service.planExisting(source.id, input(), actor());
    await service.cancelSchedule(planned.bookingId, actor());
    const bookingBefore = await prisma.booking.findUniqueOrThrow({ where: { id: planned.bookingId } });
    const assignmentsBefore = await prisma.bookingAssignment.findMany({ where: { bookingId: planned.bookingId },
      orderBy: { id: 'asc' } });
    expect((await backlog()).items.some((item: any) => item.activityId === source.id)).toBe(true);

    await service.cancelActivity(source.id, actor());

    expect(await prisma.projectActivity.findUniqueOrThrow({ where: { id: source.id } })).toMatchObject({ status: 'annule' });
    expect(await prisma.booking.findUniqueOrThrow({ where: { id: planned.bookingId } })).toEqual(bookingBefore);
    expect(await prisma.bookingAssignment.findMany({ where: { bookingId: planned.bookingId },
      orderBy: { id: 'asc' } })).toEqual(assignmentsBefore);
    expect(await prisma.auditLog.count({ where: { entityId: source.id,
      action: 'PLANNING_ACTIVITY_CANCELLED', userId: fixture.admin.id } })).toBe(1);
    expect((await backlog()).items.some((item: any) => item.activityId === source.id)).toBe(false);
    expect(await prisma.projectActivity.count({ where: { id: source.id } })).toBe(1);
  });

  it('physically deletes a new dependency-free Activity without affecting its tenant sibling', async () => {
    const source = await activity();
    const sibling = await activity();
    expect(await prisma.booking.count({ where: { activityId: source.id } })).toBe(0);
    expect(await prisma.exerciseReport.count({ where: { activityId: source.id } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { entityType: 'ProjectActivity', entityId: source.id } })).toBe(0);

    await service.deleteUnplannedActivity(source.id, actor());

    expect(await prisma.projectActivity.count({ where: { id: source.id } })).toBe(0);
    expect(await prisma.projectActivity.count({ where: { id: sibling.id, organizationId: fixture.org.id } })).toBe(1);
    expect((await backlog()).items.some((item: any) => item.activityId === source.id)).toBe(false);
  });

  it('refuses physical deletion when the Activity has Booking history', async () => {
    const source = await activity();
    const planned = await service.planExisting(source.id, input(), actor());
    await service.cancelSchedule(planned.bookingId, actor());

    await expect(service.deleteUnplannedActivity(source.id, actor())).rejects.toThrow('historique');

    expect(await prisma.projectActivity.count({ where: { id: source.id } })).toBe(1);
    expect(await prisma.booking.count({ where: { id: planned.bookingId, activityId: source.id } })).toBe(1);
  });

  it('refuses business cancellation while the Activity has an open Booking', async () => {
    const source = await activity();
    const planned = await service.planExisting(source.id, input(), actor());

    await expect(service.cancelActivity(source.id, actor())).rejects.toThrow('planification active');

    expect(await prisma.projectActivity.findUniqueOrThrow({ where: { id: source.id } })).toMatchObject({ status: 'a_faire' });
    expect(await prisma.booking.findUniqueOrThrow({ where: { id: planned.bookingId } })).toMatchObject({ status: 'CONFIRMEE' });
  });
});
