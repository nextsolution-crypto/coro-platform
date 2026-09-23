import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createBookingFixture } from './booking-postgres-fixture';
import { SchedulingService } from '../src/scheduling/scheduling.service';
import { PlanningActionsService } from '../src/planning/planning-actions.service';
import { PlanningService } from '../src/planning/planning.service';
import { BookingsService } from '../src/bookings/bookings.service';
import { BookingAssignmentsService } from '../src/bookings/booking-assignments.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Planner mutations on PostgreSQL', () => {
  const prisma = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : new PrismaClient();
  let fixture: Awaited<ReturnType<typeof createBookingFixture>>;
  let service: PlanningActionsService;
  let assignments: BookingAssignmentsService;

  beforeAll(async () => {
    await prisma.$connect();
    fixture = await createBookingFixture(prisma, true);
    service = new PlanningActionsService(prisma as any, new SchedulingService(prisma as any));
    assignments = new BookingAssignmentsService(prisma as any, new SchedulingService(prisma as any), {
      getCapacityPlanning: jest.fn().mockResolvedValue([]),
    } as any);
  });
  afterAll(async () => prisma.$disconnect());

  const activity = (clientBookable = false) => prisma.projectActivity.create({ data: {
    organizationId: fixture.org.id, projectId: fixture.project.id, type: 'inspection', label: 'Gate Planner',
    duration: '1h00', status: 'a_faire', sourceMandate: true, clientVisible: true, clientBookable,
  } });
  const actor = () => ({ userId: fixture.admin.id, organizationId: fixture.org.id, role: 'ADMIN' });
  const input = (startUtc = '2026-10-01T14:00:00.000Z') => ({ startUtc, durationMinutes: 60,
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
    await expect(service.planExisting(invalid.id, { ...input('2026-10-02T14:00:00.000Z'),
      leadUserId: fixture.outsider!.id }, actor())).rejects.toBeDefined();
    expect(await prisma.booking.count({ where: { activityId: invalid.id } })).toBe(0);

    const concurrent = await activity();
    const attempts = await Promise.allSettled([
      service.planExisting(concurrent.id, input('2026-10-02T14:00:00.000Z'), actor()),
      service.planExisting(concurrent.id, input('2026-10-02T14:00:00.000Z'), actor()),
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
    const first = await service.planExisting(source.id, input('2026-10-05T14:00:00.000Z'), actor());
    await service.cancelSchedule(first.bookingId, actor());
    expect(await prisma.booking.findUniqueOrThrow({ where: { id: first.bookingId } })).toMatchObject({ status: 'ANNULEE' });
    expect(await prisma.projectActivity.findUniqueOrThrow({ where: { id: source.id } })).toMatchObject({ id: source.id, scheduledDate: null });
    const second = await service.planExisting(source.id, input('2026-10-06T14:00:00.000Z'), actor());
    expect(second.activityId).toBe(source.id);
    expect(second.bookingId).not.toBe(first.bookingId);
    expect(await prisma.booking.count({ where: { activityId: source.id } })).toBe(2);
  });

  it('serializes Planner against the existing Booking path for the same Activity', async () => {
    const source = await activity(true);
    const bookings = new BookingsService(prisma as any, new SchedulingService(prisma as any));
    jest.spyOn(bookings as any, 'sendBookingEmail').mockResolvedValue(undefined);
    const attempts = await Promise.allSettled([
      service.planExisting(source.id, input('2026-10-08T14:00:00.000Z'), actor()),
      bookings.createBooking({ projectId: fixture.project.id, activityId: source.id,
        clientUserId: fixture.clientUser.id, activityType: source.type,
        requestedDate: new Date('2026-10-08T14:00:00.000Z'), duration: 60 }),
    ]);
    expect(attempts.filter(item => item.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.filter(item => item.status === 'rejected')).toHaveLength(1);
    expect(await prisma.booking.count({ where: { activityId: source.id,
      status: { in: ['DEMANDEE', 'CONFIRMEE', 'REPORTEE', 'REASSIGNEE'] } } })).toBe(1);
  });

  it('rolls back the Booking when Assignment persistence fails', async () => {
    const source = await activity();
    await expect(service.planExisting(source.id, input('2026-10-09T14:00:00.000Z'), {
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
    const planned = await service.planExisting(source.id, input('2026-10-12T14:00:00.000Z'), actor());
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
    await expect(service.planExisting(source.id, input('2026-10-12T14:00:00.000Z'), {
      userId: fixture.outsider!.id, organizationId: fixture.otherOrg!.id, role: 'ADMIN',
    })).rejects.toBeDefined();
    expect(await prisma.booking.count({ where: { activityId: source.id,
      status: { in: ['DEMANDEE', 'CONFIRMEE', 'REPORTEE', 'REASSIGNEE'] } } })).toBe(1);
  });

  it('cancels an Activity with terminal history while preserving its Booking and Assignments', async () => {
    const source = await activity();
    const planned = await service.planExisting(source.id, input('2026-10-13T14:00:00.000Z'), actor());
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

  it('physically deletes an Activity created by the Planner with only its intrinsic audit', async () => {
    const activityType = await prisma.activityType.create({ data: {
      organizationId: fixture.org.id, code: `custom-gate-${randomUUID()}`, nameFR: 'Gate Planner',
      defaultDurationMinutes: 60, clientBookableDefault: false,
    } });
    const planning = new PlanningService(prisma as any, new SchedulingService(prisma as any), {
      getCapacityPlanning: jest.fn().mockResolvedValue([]),
    } as any);
    const source = await planning.createUnplannedActivity({
      projectId: fixture.project.id, activityTypeId: activityType.id,
    }, actor());
    const sibling = await activity();
    expect(await prisma.booking.count({ where: { activityId: source.id } })).toBe(0);
    expect(await prisma.exerciseReport.count({ where: { activityId: source.id } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { entityType: 'ProjectActivity', entityId: source.id,
      action: 'PLANNING_ACTIVITY_CREATED' } })).toBe(1);
    expect((await backlog()).items.find((item: any) => item.activityId === source.id)).toMatchObject({
      removalAction: 'DELETE', hasBookingHistory: false,
    });

    await service.deleteUnplannedActivity(source.id, actor());

    expect(await prisma.projectActivity.count({ where: { id: source.id } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { entityType: 'ProjectActivity', entityId: source.id } })).toBe(0);
    expect(await prisma.projectActivity.count({ where: { id: sibling.id, organizationId: fixture.org.id } })).toBe(1);
    expect((await backlog()).items.some((item: any) => item.activityId === source.id)).toBe(false);
  });

  it('refuses physical deletion when the Activity has Booking history', async () => {
    const source = await activity();
    const planned = await service.planExisting(source.id, input('2026-10-14T14:00:00.000Z'), actor());
    await service.cancelSchedule(planned.bookingId, actor());

    await expect(service.deleteUnplannedActivity(source.id, actor())).rejects.toThrow('historique');

    expect(await prisma.projectActivity.count({ where: { id: source.id } })).toBe(1);
    expect(await prisma.booking.count({ where: { id: planned.bookingId, activityId: source.id } })).toBe(1);
  });

  it('refuses business cancellation while the Activity has an open Booking', async () => {
    const source = await activity();
    const planned = await service.planExisting(source.id, input('2026-10-15T14:00:00.000Z'), actor());

    await expect(service.cancelActivity(source.id, actor())).rejects.toThrow('planification active');

    expect(await prisma.projectActivity.findUniqueOrThrow({ where: { id: source.id } })).toMatchObject({ status: 'a_faire' });
    expect(await prisma.booking.findUniqueOrThrow({ where: { id: planned.bookingId } })).toMatchObject({ status: 'CONFIRMEE' });
  });

  it('lets the assigned adviser accept once while preserving Activity, Booking and Assignment', async () => {
    const source = await activity();
    const projection = new PlanningService(prisma as any, new SchedulingService(prisma as any), {
      getCapacityPlanning: jest.fn().mockResolvedValue([]),
    } as any);
    const adviser = { userId: fixture.owner.id, organizationId: fixture.org.id, role: 'OPERATOR' as const };
    const pendingBefore = await projection.myAssignments(adviser);
    const assignmentNotificationScope = { userId: fixture.owner.id,
      type: 'BOOKING_ASSIGNMENT_NEW' as const, projectId: fixture.project.id };
    const assignmentNotificationsBefore = await prisma.notification.count({
      where: assignmentNotificationScope,
    });
    const planned = await service.planExisting(source.id, input('2026-10-16T14:00:00.000Z'), actor());
    const assignment = await prisma.bookingAssignment.findFirstOrThrow({ where: {
      bookingId: planned.bookingId, userId: fixture.owner.id, role: 'LEAD', status: 'PENDING',
    } });
    const assignmentNotificationsAfter = await prisma.notification.count({
      where: assignmentNotificationScope,
    });
    expect(assignmentNotificationsAfter - assignmentNotificationsBefore).toBe(1);
    const pendingAfterPlan = await projection.myAssignments(adviser);
    expect(pendingAfterPlan.pendingCount - pendingBefore.pendingCount).toBe(1);
    expect(pendingAfterPlan.items.filter(item => item.assignmentId === assignment.id)).toEqual([
      expect.objectContaining({ assignmentId: assignment.id, bookingId: planned.bookingId,
        activityId: source.id, role: 'LEAD', assignmentStatus: 'PENDING', requiresMyAction: true }),
    ]);

    const acceptedNotificationScope = { userId: fixture.admin.id,
      type: 'BOOKING_ASSIGNMENT_ACCEPTED' as const, projectId: fixture.project.id };
    const acceptedNotificationsBefore = await prisma.notification.count({
      where: acceptedNotificationScope,
    });
    await assignments.respond(planned.bookingId, assignment.id, 'ACCEPTED', undefined, {
      userId: fixture.owner.id, organizationId: fixture.org.id, role: 'OPERATOR',
    });
    const first = await prisma.bookingAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    const acceptedNotificationsAfterFirstResponse = await prisma.notification.count({
      where: acceptedNotificationScope,
    });
    const pendingAfterAccept = await projection.myAssignments(adviser);
    await assignments.respond(planned.bookingId, assignment.id, 'ACCEPTED', undefined, {
      userId: fixture.owner.id, organizationId: fixture.org.id, role: 'OPERATOR',
    });
    const acceptedNotificationsAfterSecondResponse = await prisma.notification.count({
      where: acceptedNotificationScope,
    });
    const pendingAfterRepeatedAccept = await projection.myAssignments(adviser);

    expect(await prisma.projectActivity.count({ where: { id: source.id } })).toBe(1);
    expect(await prisma.booking.count({ where: { id: planned.bookingId, activityId: source.id } })).toBe(1);
    expect(await prisma.bookingAssignment.count({ where: { id: assignment.id,
      bookingId: planned.bookingId, status: 'ACCEPTED' } })).toBe(1);
    expect((await prisma.bookingAssignment.findUniqueOrThrow({ where: { id: assignment.id } })).respondedAt)
      .toEqual(first.respondedAt);
    expect(await prisma.auditLog.count({ where: { entityType: 'BookingAssignment', entityId: assignment.id,
      action: 'ASSIGNMENT_ACCEPTED' } })).toBe(1);
    expect(acceptedNotificationsAfterFirstResponse - acceptedNotificationsBefore).toBe(1);
    expect(acceptedNotificationsAfterSecondResponse).toBe(acceptedNotificationsAfterFirstResponse);
    expect(await prisma.notification.count({ where: assignmentNotificationScope }))
      .toBe(assignmentNotificationsAfter);
    expect(pendingAfterAccept.pendingCount).toBe(pendingAfterPlan.pendingCount - 1);
    expect(pendingAfterAccept.pendingCount).toBe(pendingBefore.pendingCount);
    expect(pendingAfterAccept.items.some(item => item.assignmentId === assignment.id)).toBe(false);
    expect(pendingAfterRepeatedAccept.pendingCount).toBe(pendingAfterAccept.pendingCount);
    expect(pendingAfterRepeatedAccept.items.some(item => item.assignmentId === assignment.id)).toBe(false);
  });

  it('preserves a declined LEAD and projects replacement required for the administrator', async () => {
    const source = await activity();
    const planned = await service.planExisting(source.id, input('2026-10-19T14:00:00.000Z'), actor());
    const assignment = await prisma.bookingAssignment.findFirstOrThrow({ where: {
      bookingId: planned.bookingId, userId: fixture.owner.id, role: 'LEAD', status: 'PENDING',
    } });
    await assignments.respond(planned.bookingId, assignment.id, 'DECLINED', 'Indisponible', {
      userId: fixture.owner.id, organizationId: fixture.org.id, role: 'OPERATOR',
    });
    const declined = await prisma.bookingAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(declined).toMatchObject({ status: 'DECLINED', declineReason: 'Indisponible' });
    expect(declined.respondedAt).toBeInstanceOf(Date);
    expect(declined.endedAt).toBeInstanceOf(Date);
    expect(await prisma.booking.count({ where: { id: planned.bookingId, activityId: source.id } })).toBe(1);
    expect(await prisma.projectActivity.count({ where: { id: source.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: assignment.id,
      action: 'ASSIGNMENT_REFUSED' } })).toBe(1);
    const actions = await new PlanningService(prisma as any, new SchedulingService(prisma as any), {
      getCapacityPlanning: jest.fn().mockResolvedValue([]),
    } as any).actions({ start: '2026-10-01T04:00:00.000Z', end: '2026-10-31T04:00:00.000Z',
      type: 'NO_ACCEPTED_LEAD' }, actor());
    expect(actions.items.some((item: any) => item.bookingId === planned.bookingId &&
      item.type === 'NO_ACCEPTED_LEAD')).toBe(true);
  });

  it('serializes adviser response against administrator reassignment', async () => {
    const source = await activity();
    const planned = await service.planExisting(source.id, input('2026-10-20T14:00:00.000Z'), actor());
    const old = await prisma.bookingAssignment.findFirstOrThrow({ where: {
      bookingId: planned.bookingId, userId: fixture.owner.id, role: 'LEAD', status: 'PENDING',
    } });
    const attempts = await Promise.allSettled([
      assignments.respond(planned.bookingId, old.id, 'ACCEPTED', undefined, {
        userId: fixture.owner.id, organizationId: fixture.org.id, role: 'OPERATOR',
      }),
      service.reassign(planned.bookingId, { leadUserId: fixture.target.id,
        supportUserIds: [], confirmUnknown: true }, actor()),
    ]);
    expect(attempts.some(result => result.status === 'fulfilled')).toBe(true);
    const historical = await prisma.bookingAssignment.findUniqueOrThrow({ where: { id: old.id } });
    expect(['ACCEPTED', 'REPLACED']).toContain(historical.status);
    expect(await prisma.bookingAssignment.count({ where: { bookingId: planned.bookingId,
      role: 'LEAD', status: { in: ['PENDING', 'ACCEPTED'] } } })).toBe(1);
  });
});
