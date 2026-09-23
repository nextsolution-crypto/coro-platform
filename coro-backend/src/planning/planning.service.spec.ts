import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PlanningService, planningWindow } from './planning.service';

const start = '2026-09-23T00:00:00Z';
const end = '2026-09-25T00:00:00Z';
const actor = { userId: 'u1', organizationId: 'org-a', role: 'ADMIN' };
const user = (id: string) => ({ id, email: `${id}@example.com`, firstName: id, lastName: 'Conseiller',
  title: 'Conseiller', timeZone: 'America/Toronto', timeZoneVerified: true });
const project = { name: 'Projet privé', clientId: 'client-a', buildingId: 'building-a',
  client: { name: 'Client privé' }, user: { firstName: 'Responsable', lastName: 'Dossier' },
  building: { name: 'Bâtiment privé', timeZone: 'America/Toronto', timeZoneVerified: true } };
const booking = (status: string, assignmentStatus: string) => ({ id: `b-${status}`,
  requestedDate: new Date('2026-09-23T14:00:00Z'), reportedDate: null, duration: 60, status,
  activityType: 'Visite privée', projectId: 'project-a', project,
  assignments: [{ id: `a-${status}`, userId: 'u2', role: 'LEAD', status: assignmentStatus }] });

function setup() {
  const prisma = {
    user: { findFirst: jest.fn().mockResolvedValue({ id: 'u1', timeZone: 'America/Toronto', timeZoneVerified: true }),
      findMany: jest.fn().mockResolvedValue([user('u1'), user('u2')]) },
    booking: { findMany: jest.fn().mockResolvedValue([]) },
    userWorkSchedule: { findMany: jest.fn().mockResolvedValue([]) },
    userUnavailability: { findMany: jest.fn().mockResolvedValue([]) },
    projectActivity: { findMany: jest.fn().mockResolvedValue([]) },
    auditLog: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const scheduling = { analyzeManySlots: jest.fn().mockResolvedValue(new Map()) };
  const capacity = { getCapacityPlanning: jest.fn().mockResolvedValue([
    { userId: 'u1', chargeEngagee: 10, chargeProvisoire: 2, tauxUtilisationConfirmee: 10 },
    { userId: 'u2', chargeEngagee: 20, chargeProvisoire: 3, tauxUtilisationConfirmee: 20 },
  ]) };
  return { prisma, scheduling, capacity,
    service: new PlanningService(prisma as any, scheduling as any, capacity as any) };
}

describe('PlanningService', () => {
  it('validates a half-open ISO window of at most 31 days', () => {
    expect(planningWindow({ start, end }).startUtc.toISOString()).toBe(start.replace('Z', '.000Z'));
    expect(() => planningWindow({ start: end, end: start })).toThrow(BadRequestException);
    expect(() => planningWindow({ start, end: '2026-10-25T00:00:00Z' })).toThrow(BadRequestException);
    expect(() => planningWindow({ start: '2026-09-23', end })).toThrow(BadRequestException);
  });

  it('rejects client roles before reading organization data', async () => {
    const { service, prisma } = setup();
    await expect(service.team({ start, end }, { ...actor, role: 'CLIENT' })).rejects.toThrow(ForbiddenException);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('scopes every source to JWT organization, and projects admin capacity only as a summary', async () => {
    const { service, prisma, capacity } = setup();
    const result = await service.team({ start, end }, actor);
    expect(prisma.user.findMany.mock.calls[0][0].where.organizationId).toBe('org-a');
    for (const source of ['booking', 'userWorkSchedule', 'userUnavailability', 'projectActivity'] as const) {
      expect(prisma[source].findMany.mock.calls[0][0].where.organizationId).toBe('org-a');
    }
    expect(capacity.getCapacityPlanning).toHaveBeenCalledTimes(1);
    expect(result.users[1]).toMatchObject({ id: 'u2', capacity: { chargeEngagee: 20 } });
    expect(JSON.stringify(result.users)).not.toContain('chargeDetails');
  });

  it('limits colleague data for operators and never selects private absence fields', async () => {
    const { service, prisma } = setup();
    prisma.userUnavailability.findMany.mockResolvedValue([{ id: 'absence', userId: 'u2',
      startAt: new Date(start), endAt: new Date(end), timeZone: 'America/Toronto',
      type: 'SICK', privateNote: 'secret' }]);
    prisma.booking.findMany.mockResolvedValue([booking('CONFIRMEE', 'ACCEPTED')]);
    const result = await service.team({ start, end }, { ...actor, role: 'OPERATOR' });
    expect(result.users[0]).toHaveProperty('capacity');
    expect(result.users[1]).toEqual({ id: 'u2', name: 'u2 Conseiller', title: 'Conseiller', availability: 'GENERIC' });
    expect(result.events.find((e: any) => e.source === 'BOOKING')).toMatchObject({ label: 'Occupé', status: 'BUSY' });
    expect(result.events.find((e: any) => e.source === 'BOOKING')).not.toHaveProperty('assignments');
    expect(result.events.find((e: any) => e.source === 'BOOKING')).not.toHaveProperty('clientName');
    expect(prisma.userUnavailability.findMany.mock.calls[0][0].select).toEqual({
      id: true, userId: true, startAt: true, endAt: true, timeZone: true });
    expect(JSON.stringify(result)).not.toMatch(/SICK|secret|Visite privée|Projet privé/);
  });

  it('projects requested and accepted bookings, ignores closed ones, and creates lead/pending actions', async () => {
    const { service, prisma, scheduling } = setup();
    prisma.booking.findMany.mockResolvedValue([booking('DEMANDEE', 'PENDING'),
      booking('CONFIRMEE', 'ACCEPTED'), booking('ANNULEE', 'ACCEPTED')]);
    const result = await service.team({ start, end }, actor);
    expect(result.events.filter((e: any) => e.source === 'BOOKING')).toHaveLength(2);
    expect(result.events.find((e: any) => e.bookingId === 'b-DEMANDEE')).toMatchObject({
      status: 'REQUESTED', label: 'Demande client — non confirmée', needsAction: true });
    expect(result.events.find((e: any) => e.bookingId === 'b-CONFIRMEE')).toMatchObject({ status: 'CONFIRMED' });
    expect(result.events.find((e: any) => e.bookingId === 'b-CONFIRMEE')).toMatchObject({
      bookingStatus: 'CONFIRMEE', assignments: [{ userId: 'u2', role: 'LEAD', status: 'ACCEPTED' }],
      projectName: 'Projet privé', clientName: 'Client privé', buildingName: 'Bâtiment privé',
      ownerName: 'Responsable Dossier',
    });
    expect(result.actionSummary).toMatchObject({ requestedBookings: 1, bookingsWithoutAcceptedLead: 1,
      pendingAssignments: 1 });
    expect(scheduling.analyzeManySlots).toHaveBeenCalledTimes(1);
  });

  it('projects mutation identifiers and the effective reported slot', async () => {
    const { service, prisma } = setup();
    prisma.booking.findMany.mockResolvedValue([{ ...booking('REPORTEE', 'ACCEPTED'),
      requestedDate: new Date('2026-09-23T17:45:00.000Z'),
      reportedDate: new Date('2026-09-24T17:45:00.000Z'), duration: 90,
      activity: { id: 'activity-a', type: 'inspection', label: 'Inspection', customLabel: null,
        activityTypeId: 'type-a', activityType: { code: 'INSPECTION', nameFR: 'Inspection', visualToken: 'BLUE', iconKey: null } } }]);
    const result = await service.team({ start, end: '2026-09-26T00:00:00Z' }, actor);
    expect(result.events[0]).toMatchObject({ startUtc: new Date('2026-09-24T17:45:00.000Z'),
      endUtc: new Date('2026-09-24T19:15:00.000Z'), bookingId: 'b-REPORTEE', activityId: 'activity-a',
      activityTypeId: 'type-a', projectId: 'project-a', buildingId: 'building-a', clientId: 'client-a' });
  });

  it('keeps the reported slot and replacement active LEAD after reassignment', async () => {
    const { service, prisma } = setup();
    prisma.booking.findMany.mockResolvedValue([{ ...booking('REASSIGNEE', 'PENDING'),
      requestedDate: new Date('2026-09-23T17:45:00.000Z'),
      reportedDate: new Date('2026-09-24T17:45:00.000Z'), duration: 90,
      assignments: [{ id: 'new-lead', userId: 'u1', role: 'LEAD', status: 'PENDING' }],
      activity: { id: 'activity-a', type: 'inspection', label: 'Inspection', customLabel: null,
        activityTypeId: 'type-a', activityType: null } }]);
    const result = await service.team({ start, end: '2026-09-26T00:00:00Z' }, actor);
    expect(result.events[0]).toMatchObject({ bookingId: 'b-REASSIGNEE', activityId: 'activity-a',
      bookingStatus: 'REASSIGNEE', startUtc: new Date('2026-09-24T17:45:00.000Z'),
      endUtc: new Date('2026-09-24T19:15:00.000Z'), userIds: ['u1'],
      assignments: [{ userId: 'u1', role: 'LEAD', status: 'PENDING' }] });
  });

  it('projects work intervals and generic absences, and only legacy activities without a booking', async () => {
    const { service, prisma } = setup();
    prisma.userWorkSchedule.findMany.mockResolvedValue([{ id: 'ws', userId: 'u2', verifiedAt: new Date(),
      timeZone: 'America/Toronto', effectiveFrom: new Date('2026-09-01'), effectiveUntil: null,
      intervals: [{ dayOfWeek: 3, startTime: 540, endTime: 1020 }] }]);
    prisma.userUnavailability.findMany.mockResolvedValue([{ id: 'absence', userId: 'u2',
      startAt: new Date('2026-09-23T18:00:00Z'), endAt: new Date('2026-09-23T19:00:00Z'),
      timeZone: 'America/Toronto' }]);
    const activity = (id: string, bookings: any[]) => ({ id, scheduledDate: new Date('2026-09-23T14:00:00Z'),
      duration: '1 h', customDuration: null, label: 'Legacy', customLabel: null, assigneeEmail: 'u2@example.com',
      sourceMandate: false, clientBookable: false, projectId: 'project-a', project, bookings });
    prisma.projectActivity.findMany.mockResolvedValue([activity('legacy', []), activity('linked', [{ id: 'b', status: 'CONFIRMEE' }])]);
    const result = await service.team({ start, end }, actor);
    expect(result.workIntervals.some((i: any) => i.userId === 'u2')).toBe(true);
    expect(result.events.filter((e: any) => e.source === 'LEGACY_ACTIVITY')).toHaveLength(1);
    expect(result.events.find((e: any) => e.source === 'USER_UNAVAILABILITY')).toMatchObject({ label: 'Indisponible' });
  });

  it('counts blocked and unknown signals and paginates action items', async () => {
    const { service, prisma, scheduling } = setup();
    prisma.booking.findMany.mockResolvedValue([booking('DEMANDEE', 'PENDING')]);
    scheduling.analyzeManySlots.mockResolvedValue(new Map([['b-DEMANDEE:u2', {
      status: 'BLOCKED', conflicts: [], warnings: [], sourcesChecked: [] }]]));
    prisma.projectActivity.findMany.mockResolvedValue([{ id: 'unplanned', scheduledDate: null,
      duration: '1 h', customDuration: null, label: 'À planifier', customLabel: null,
      assigneeEmail: 'u2@example.com', sourceMandate: true, clientBookable: false,
      projectId: 'project-a', project, bookings: [] }]);
    const result = await service.actions({ start, end, page: '1', limit: '2' }, actor);
    expect(result.total).toBe(5);
    expect(result.items).toHaveLength(2);
    const blocked = await service.actions({ start, end, type: 'SCHEDULING_BLOCKED' }, actor);
    expect(blocked.items).toMatchObject([{ type: 'SCHEDULING_BLOCKED' }]);
    expect(await service.actions({ start, end, type: 'UNPLANNED_ACTIVITY' }, actor)).toMatchObject({ total: 1 });
  });

  it('projects terminal Booking context without merging otherwise identical Activities', async () => {
    const { service, prisma } = setup();
    const terminal = (id: string, hour: number, lead: string) => ({ id: `booking-${id}`, status: 'ANNULEE',
      requestedDate: new Date(`2026-09-23T${hour}:00:00.000Z`),
      reportedDate: new Date(`2026-09-24T${hour}:00:00.000Z`), duration: 90, createdAt: new Date(),
      assignments: [{ userId: `user-${id}`, user: { firstName: lead, lastName: 'Parker' } }] });
    prisma.projectActivity.findMany.mockResolvedValue(['a', 'b', 'c', 'd'].map((id, index) => ({
      id, scheduledDate: null, duration: '1h30', customDuration: null, label: 'Inspection', customLabel: `Visite ${id}`,
      type: 'inspection', assigneeEmail: null, sourceMandate: true, clientBookable: false,
      activityTypeId: 'type-a', activityType: { nameFR: 'Inspection' }, projectId: 'project-a', project,
      exerciseReport: null, bookings: [terminal(id, 13 + index, index ? 'Alex' : 'Steve')],
    })));
    const result = await service.actions({ start, end, type: 'UNPLANNED_ACTIVITY' }, actor);
    expect(result.total).toBe(4);
    expect(result.items.map((item: any) => item.activityId)).toEqual(['a', 'b', 'c', 'd']);
    expect(result.items[0]).toMatchObject({ label: 'Visite a', hasBookingHistory: true,
      lastBookingId: 'booking-a', lastEffectiveStartUtc: new Date('2026-09-24T13:00:00.000Z'),
      lastDurationMinutes: 90, lastBookingStatus: 'ANNULEE',
      lastLead: { userId: 'user-a', displayName: 'Steve Parker' }, removalAction: 'CANCEL' });
  });

  it('keeps a never-planned Activity without invented slot and marks deletion eligibility', async () => {
    const { service, prisma } = setup();
    prisma.projectActivity.findMany.mockResolvedValue([{ id: 'fresh', scheduledDate: null, duration: '1h',
      customDuration: null, label: 'Inspection', customLabel: null, type: 'inspection', assigneeEmail: null,
      sourceMandate: true, clientBookable: false, activityTypeId: 'type-a', activityType: { nameFR: 'Inspection' },
      projectId: 'project-a', project, exerciseReport: null, bookings: [] }]);
    const result = await service.actions({ start, end, type: 'UNPLANNED_ACTIVITY' }, actor);
    expect(result.items[0]).toMatchObject({ activityId: 'fresh', hasBookingHistory: false,
      lastEffectiveStartUtc: undefined, removalAction: 'DELETE' });
  });

  it('projects UNKNOWN Scheduling as a separate action', async () => {
    const { service, prisma, scheduling } = setup();
    prisma.booking.findMany.mockResolvedValue([booking('CONFIRMEE', 'ACCEPTED')]);
    scheduling.analyzeManySlots.mockResolvedValue(new Map([['b-CONFIRMEE:u2', {
      status: 'UNKNOWN', conflicts: [], warnings: ['Horaire non configuré'], sourcesChecked: [],
    }]]));
    const result = await service.team({ start, end }, actor);
    expect(result.actionSummary.unknownAvailability).toBe(1);
    expect(result.events[0].warnings).toContain('Horaire non configuré');
  });

  it('accepts exactly 2,000 candidates and reads one sentinel row for both sources', async () => {
    const { service, prisma } = setup();
    prisma.booking.findMany.mockResolvedValue(Array(2000).fill(booking('CONFIRMEE', 'ACCEPTED')));
    const result = await service.team({ start, end }, actor);
    expect(result.events.filter((event: any) => event.source === 'BOOKING')).toHaveLength(2000);
    expect(prisma.booking.findMany.mock.calls[0][0].take).toBe(2001);
    expect(prisma.projectActivity.findMany.mock.calls[0][0].take).toBe(2001);
  });

  it('accepts exactly 2,000 Activity candidates', async () => {
    const { service, prisma } = setup();
    prisma.projectActivity.findMany.mockResolvedValue(Array(2000).fill({
      id: 'inactive-for-window', scheduledDate: null, sourceMandate: false, clientBookable: false,
      assigneeEmail: null, bookings: [], project: { clientId: 'client-a', buildingId: 'building-a' },
    }));
    const result = await service.actions({ start, end }, actor);
    expect(result.total).toBe(0);
    expect(prisma.projectActivity.findMany.mock.calls[0][0].take).toBe(2001);
  });

  it.each(['team', 'actions'] as const)('%s rejects 2,001 Bookings without returning a partial response', async route => {
    const { service, prisma, scheduling } = setup();
    prisma.booking.findMany.mockResolvedValue(Array(2001).fill(null));
    await expect(service[route]({ start, end }, actor)).rejects.toThrow('Trop de résultats : réduire la période ou filtrer');
    expect(scheduling.analyzeManySlots).not.toHaveBeenCalled();
    expect(prisma.booking.findMany.mock.calls[0][0].take).toBe(2001);
  });

  it.each(['team', 'actions'] as const)('%s rejects 2,001 Activities without returning a partial response', async route => {
    const { service, prisma, scheduling } = setup();
    prisma.projectActivity.findMany.mockResolvedValue(Array(2001).fill(null));
    await expect(service[route]({ start, end }, actor)).rejects.toThrow(BadRequestException);
    expect(scheduling.analyzeManySlots).not.toHaveBeenCalled();
    expect(prisma.projectActivity.findMany.mock.calls[0][0].take).toBe(2001);
  });

  it('applies tenant, date, client, building, status, and user filters before the candidate cap', async () => {
    const { service, prisma } = setup();
    prisma.user.findMany.mockResolvedValue([user('u2')]);
    await service.actions({ start, end, userId: 'u2', clientId: 'client-a',
      buildingId: 'building-a', projectId: 'project-a', activityTypeId: 'type-a', bookingStatus: 'DEMANDEE' }, actor);
    const usersWhere = prisma.user.findMany.mock.calls[0][0].where;
    const bookingQuery = prisma.booking.findMany.mock.calls[0][0];
    const activityQuery = prisma.projectActivity.findMany.mock.calls[0][0];
    expect(usersWhere).toMatchObject({ organizationId: 'org-a', id: 'u2' });
    expect(bookingQuery.where).toMatchObject({ organizationId: 'org-a',
      status: { in: ['DEMANDEE'] }, project: { clientId: 'client-a', buildingId: 'building-a', id: 'project-a' },
      activity: { activityTypeId: 'type-a' },
      assignments: { some: { userId: { in: ['u2'] } } } });
    expect(bookingQuery.where.OR).toEqual(expect.arrayContaining([
      { reportedDate: null, requestedDate: { gte: expect.any(Date), lt: expect.any(Date) } },
    ]));
    expect(activityQuery.where).toMatchObject({ organizationId: 'org-a',
      project: { clientId: 'client-a', buildingId: 'building-a', id: 'project-a' }, activityTypeId: 'type-a',
      assigneeEmail: { in: ['u2@example.com'], mode: 'insensitive' } });
    expect(activityQuery.where.OR).toEqual(expect.arrayContaining([{ scheduledDate: null }]));
  });

  it('retains Booking-level actions under a selected user filter', async () => {
    const { service, prisma } = setup();
    prisma.user.findMany.mockResolvedValue([user('u2')]);
    prisma.booking.findMany.mockResolvedValue([booking('DEMANDEE', 'PENDING')]);
    const result = await service.actions({ start, end, userId: 'u2' }, actor);
    expect(result.items.map(item => item.type)).toEqual(expect.arrayContaining([
      'BOOKING_REQUESTED', 'NO_ACCEPTED_LEAD', 'PENDING_ASSIGNMENT',
    ]));
  });

  it('returns tenant-scoped context and derives the mandate owner from ProjectMandate', async () => {
    const prisma = {
      client: { findMany: jest.fn().mockResolvedValue([{ id: 'c1', name: 'Client' }]) },
      building: { findMany: jest.fn().mockResolvedValue([{ id: 'bd1', clientId: 'c1', name: 'Building' }]) },
      project: { findMany: jest.fn().mockResolvedValue([{ id: 'p1', name: 'Mandate', clientId: 'c1', buildingId: 'bd1',
        user: { id: 'legacy-owner', firstName: 'Legacy', lastName: 'Owner' },
        mandate: { id: 'm1', ownerId: 'owner', owner: { firstName: 'Real', lastName: 'Owner' } } }]) },
      activityType: { findMany: jest.fn().mockResolvedValue([{ id: 't1', nameFR: 'Inspection' }]) },
    };
    const service = new PlanningService(prisma as any, {} as any, {} as any);
    const result = await service.context({ clientId: 'c1', buildingId: 'bd1' }, actor);
    expect(prisma.client.findMany.mock.calls[0][0].where).toMatchObject({ organizationId: 'org-a' });
    expect(prisma.building.findMany.mock.calls[0][0].where).toMatchObject({ organizationId: 'org-a', clientId: 'c1' });
    expect(prisma.project.findMany.mock.calls[0][0].where).toMatchObject({ organizationId: 'org-a', clientId: 'c1', buildingId: 'bd1' });
    expect(prisma.activityType.findMany.mock.calls[0][0].where.OR).toEqual([{ organizationId: null }, { organizationId: 'org-a' }]);
    expect(result.projects[0]).toMatchObject({ mandateId: 'm1', owner: { firstName: 'Real' } });
  });

  it('scopes Operator context clients, buildings and projects through projectAccessWhere', async () => {
    const prisma = {
      client: { findMany: jest.fn().mockResolvedValue([]) }, building: { findMany: jest.fn().mockResolvedValue([]) },
      project: { findMany: jest.fn().mockResolvedValue([]) }, activityType: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new PlanningService(prisma as any, {} as any, {} as any);
    await service.context({}, { ...actor, role: 'OPERATOR' });
    const scope = { organizationId: 'org-a', OR: [{ userId: 'u1' }, { lastEditedById: 'u1' }] };
    expect(prisma.client.findMany.mock.calls[0][0].where.projects.some).toEqual(scope);
    expect(prisma.building.findMany.mock.calls[0][0].where.projects.some).toEqual(scope);
    expect(prisma.project.findMany.mock.calls[0][0].where).toMatchObject(scope);
  });
  it('creates an unplanned mandate Activity and its audit atomically without a Booking', async () => {
    const tx = { projectActivity: { create: jest.fn().mockResolvedValue({ id: 'activity-1' }) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) } };
    const prisma = {
      project: { findFirst: jest.fn().mockResolvedValue({ id: 'project-1' }) },
      activityType: { findFirst: jest.fn().mockResolvedValue({ id: 'type-1', code: 'inspection', nameFR: 'Inspection',
        defaultDurationMinutes: 90, clientBookableDefault: false }) },
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };
    const service = new PlanningService(prisma as any, {} as any, {} as any);
    await service.createUnplannedActivity({ projectId: 'project-1', activityTypeId: 'type-1' }, actor);
    expect(prisma.project.findFirst.mock.calls[0][0].where).toMatchObject({ id: 'project-1', organizationId: 'org-a' });
    expect(tx.projectActivity.create.mock.calls[0][0].data).toMatchObject({ organizationId: 'org-a', projectId: 'project-1',
      scheduledDate: null, status: 'a_faire', sourceMandate: true, duration: '1h30' });
    expect(tx.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: 'PLANNING_ACTIVITY_CREATED', entityId: 'activity-1' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('previews active candidates in one Scheduling batch with generic confidential reasons', async () => {
    const prisma = {
      building: { findFirst: jest.fn().mockResolvedValue({ id: 'building-a', timeZone: 'America/Toronto', timeZoneVerified: true }) },
      user: { findMany: jest.fn().mockResolvedValue([
        { id: 'available', firstName: 'Alice', lastName: 'Able', email: 'alice@example.com' },
        { id: 'unknown', firstName: 'Uma', lastName: 'Unknown', email: 'uma@example.com' },
        { id: 'blocked', firstName: 'Steve', lastName: 'Parker', email: 'steve@example.com' },
      ]) },
    };
    const scheduling = { analyzeUsers: jest.fn().mockResolvedValue(new Map([
      ['available', { status: 'AVAILABLE', conflicts: [], warnings: [], sourcesChecked: [] }],
      ['unknown', { status: 'UNKNOWN', conflicts: [], warnings: ['Horaire non configure'], sourcesChecked: [] }],
      ['blocked', { status: 'BLOCKED', conflicts: [{ severity: 'BLOCKED', source: 'USER_UNAVAILABILITY',
        startUtc: new Date('2026-09-23T17:00:00Z'), endUtc: new Date('2026-09-23T20:00:00Z'),
        label: 'Formation', reason: 'note privee' }], warnings: [], sourcesChecked: [] }],
    ])) };
    const capacity = { getCapacityPlanning: jest.fn().mockResolvedValue([
      { userId: 'available', tauxUtilisationConfirmee: 32 },
    ]) };
    const service = new PlanningService(prisma as any, scheduling as any, capacity as any);
    const result = await service.teamPreview({ buildingId: 'building-a',
      startUtc: '2026-09-23T17:30:00.000Z', durationMinutes: 90 }, actor);
    expect(result.candidates.map(candidate => candidate.availabilityStatus)).toEqual(['AVAILABLE', 'UNKNOWN', 'BLOCKED']);
    expect(result.candidates[0]).toMatchObject({ userId: 'available', capacityCommittedPercent: 32 });
    expect(result.candidates[2]).toMatchObject({ userId: 'blocked', genericReason: 'Indisponible.',
      blockedInterval: { startUtc: expect.any(Date), endUtc: expect.any(Date) } });
    expect(JSON.stringify(result)).not.toMatch(/Formation|note privee|conflicts|warnings/);
    expect(scheduling.analyzeUsers).toHaveBeenCalledTimes(1);
    expect(capacity.getCapacityPlanning).toHaveBeenCalledTimes(1);
    expect(prisma.user.findMany.mock.calls[0][0].where).toMatchObject({ organizationId: 'org-a', isActive: true });
  });

  it('limits an operator preview to self and rejects a client before database reads', async () => {
    const prisma = { building: { findFirst: jest.fn().mockResolvedValue({ id: 'building-a' }) },
      user: { findMany: jest.fn().mockResolvedValue([]) } };
    const scheduling = { analyzeUsers: jest.fn().mockResolvedValue(new Map()) };
    const capacity = { getCapacityPlanning: jest.fn().mockResolvedValue([]) };
    const service = new PlanningService(prisma as any, scheduling as any, capacity as any);
    await service.teamPreview({ buildingId: 'building-a', startUtc: start, durationMinutes: 60 }, { ...actor, role: 'OPERATOR' });
    expect(prisma.user.findMany.mock.calls[0][0].where).toMatchObject({ organizationId: 'org-a', id: 'u1' });
    prisma.building.findFirst.mockClear();
    await expect(service.teamPreview({ buildingId: 'building-a', startUtc: start, durationMinutes: 60 },
      { ...actor, role: 'CLIENT' })).rejects.toThrow(ForbiddenException);
    expect(prisma.building.findFirst).not.toHaveBeenCalled();
  });
});
