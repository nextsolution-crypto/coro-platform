import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CapacityService } from '../mandate/capacity.service';
import { SchedulingService, bookingInterval, overlaps } from '../scheduling/scheduling.service';
import { OPEN_BOOKING_STATUSES } from '../bookings/booking-status';
import { assertIanaTimeZone } from '../bookings/booking-time';
import { parseActivityDurationHours } from '../mandate/capacity-duration';
import { scheduleRanges } from '../work-schedules/work-schedule-time';
import { PlanningActionsDto, PlanningWindowDto } from './planning.dto';

type Actor = { userId: string; organizationId: string; role: string };
const DAY = 86_400_000;
const MAX_CANDIDATES = 2000;
type ActionType = 'BOOKING_REQUESTED' | 'NO_ACCEPTED_LEAD' | 'PENDING_ASSIGNMENT' |
  'SCHEDULING_BLOCKED' | 'SCHEDULING_UNKNOWN' | 'UNPLANNED_ACTIVITY';
type Action = { id: string; type: ActionType; groupId: string; bookingId?: string; activityId?: string;
  userId?: string; startUtc: Date | null; label: string; clientId?: string; buildingId?: string };

export function planningWindow(query: PlanningWindowDto) {
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
  if (!iso.test(query.start) || !iso.test(query.end)) throw new BadRequestException('start/end ISO avec fuseau requis');
  const startUtc = new Date(query.start);
  const endUtc = new Date(query.end);
  if (!Number.isFinite(startUtc.getTime()) || !Number.isFinite(endUtc.getTime()) ||
      endUtc <= startUtc || endUtc.getTime() - startUtc.getTime() > 31 * DAY) {
    throw new BadRequestException('Fenêtre [start,end) invalide ou supérieure à 31 jours');
  }
  if (query.displayTimeZone) assertIanaTimeZone(query.displayTimeZone);
  const userIds = query.userIds?.split(',').map(id => id.trim()).filter(Boolean);
  if (userIds && (userIds.length > 50 || new Set(userIds).size !== userIds.length)) throw new BadRequestException('userIds invalides');
  return { startUtc, endUtc, userIds };
}

function staff(actor: Actor) {
  if (!actor?.organizationId || !actor.userId || !['ADMIN', 'SUPER_ADMIN', 'OPERATOR'].includes(actor.role)) {
    throw new ForbiddenException('Planning interne réservé aux conseillers');
  }
}

function activityInterval(activity: any) {
  if (!activity.scheduledDate) return null;
  const hours = parseActivityDurationHours(activity.customDuration || activity.duration);
  if (!hours || hours <= 0 || hours > 24) return null;
  const timeZone = activity.project.building?.timeZone ?? 'America/Toronto';
  const local = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(activity.scheduledDate);
  if ((activity.scheduledDate.getUTCHours() === 0 && activity.scheduledDate.getUTCMinutes() === 0) ||
    (local.find(part => part.type === 'hour')?.value === '00' && local.find(part => part.type === 'minute')?.value === '00')) return null;
  return { startUtc: activity.scheduledDate as Date,
    endUtc: new Date(activity.scheduledDate.getTime() + hours * 3_600_000), timeZone };
}

@Injectable()
export class PlanningService {
  constructor(private readonly prisma: PrismaService, private readonly scheduling: SchedulingService,
    private readonly capacity: CapacityService) {}

  private async snapshot(query: PlanningWindowDto, actor: Actor, withCapacity: boolean) {
    staff(actor);
    const window = planningWindow(query);
    const own = actor.role === 'OPERATOR';
    const actorUser = await this.prisma.user.findFirst({ where: { id: actor.userId, organizationId: actor.organizationId, isActive: true },
      select: { id: true, timeZone: true, timeZoneVerified: true } });
    if (!actorUser) throw new ForbiddenException('Conseiller introuvable');
    const displayTimeZone = query.displayTimeZone ?? actorUser.timeZone ?? 'America/Toronto';
    assertIanaTimeZone(displayTimeZone);
    const warnings: string[] = [];
    if (!query.displayTimeZone && !actorUser.timeZoneVerified) warnings.push('Fuseau horaire du conseiller non vérifié');
    const actionUserId = 'userId' in query ? (query as PlanningActionsDto).userId : undefined;
    const filteredUsers = !!(window.userIds || query.search || actionUserId);
    const users = await this.prisma.user.findMany({ where: { organizationId: actor.organizationId, isActive: true,
      role: { in: ['ADMIN', 'OPERATOR'] },
      ...(window.userIds ? { id: { in: window.userIds } } : {}),
      ...(actionUserId ? { id: actionUserId } : {}),
      ...(query.search ? { OR: [
        { firstName: { contains: query.search, mode: 'insensitive' as const } },
        { lastName: { contains: query.search, mode: 'insensitive' as const } },
        { email: { contains: query.search, mode: 'insensitive' as const } },
      ] } : {}),
    }, select: { id: true, email: true, firstName: true, lastName: true, title: true,
      timeZone: true, timeZoneVerified: true }, orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }], take: 51 });
    if (users.length > 50) throw new BadRequestException('Plus de 50 conseillers : préciser un filtre');
    const ids = users.map(user => user.id);
    const emailToId = new Map(users.map(user => [user.email.toLowerCase(), user.id]));
    const earliest = new Date(window.startUtc.getTime() - DAY);
    const [bookings, schedules, absences, activities, capacityRows] = await Promise.all([
      this.prisma.booking.findMany({ where: { organizationId: actor.organizationId,
        status: { in: query.bookingStatus ? [query.bookingStatus] : [...OPEN_BOOKING_STATUSES] },
        OR: [{ reportedDate: null, requestedDate: { gte: earliest, lt: window.endUtc } },
          { reportedDate: { gte: earliest, lt: window.endUtc } }],
        ...(query.clientId || query.buildingId ? { project: {
          ...(query.clientId ? { clientId: query.clientId } : {}),
          ...(query.buildingId ? { buildingId: query.buildingId } : {}),
        } } : {}),
        ...(filteredUsers ? { assignments: { some: { userId: { in: ids },
          status: { in: ['PENDING', 'ACCEPTED'] } } } } : {}),
      }, select: { id: true, requestedDate: true, reportedDate: true, duration: true, status: true,
        activityType: true, projectId: true, activity: { select: { type: true, customLabel: true, label: true,
          activityType: { select: { code: true, nameFR: true, visualToken: true, iconKey: true } } } },
        project: { select: { name: true, clientId: true, buildingId: true,
          client: { select: { name: true } }, user: { select: { firstName: true, lastName: true } },
          building: { select: { name: true, timeZone: true, timeZoneVerified: true } } } },
        assignments: { where: { status: { in: ['PENDING', 'ACCEPTED'] } },
          select: { id: true, userId: true, status: true, role: true } },
      }, take: MAX_CANDIDATES + 1 }),
      this.prisma.userWorkSchedule.findMany({ where: { organizationId: actor.organizationId, userId: { in: ids },
        effectiveFrom: { lt: new Date(window.endUtc.getTime() + 2 * DAY) },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: new Date(window.startUtc.getTime() - 2 * DAY) } }] },
        include: { intervals: true } }),
      this.prisma.userUnavailability.findMany({ where: { organizationId: actor.organizationId, userId: { in: ids },
        cancelledAt: null, startAt: { lt: window.endUtc }, endAt: { gt: window.startUtc } },
        select: { id: true, userId: true, startAt: true, endAt: true, timeZone: true } }),
      this.prisma.projectActivity.findMany({ where: { organizationId: actor.organizationId,
        status: { notIn: ['annule', 'fait', 'termine'] },
        OR: [{ scheduledDate: { gte: earliest, lt: window.endUtc } }, { scheduledDate: null }],
        ...(query.clientId || query.buildingId ? { project: {
          ...(query.clientId ? { clientId: query.clientId } : {}),
          ...(query.buildingId ? { buildingId: query.buildingId } : {}),
        } } : {}),
        ...(filteredUsers ? { assigneeEmail: { in: users.map(user => user.email), mode: 'insensitive' as const } } : {}),
      }, select: { id: true, scheduledDate: true, duration: true, customDuration: true,
        label: true, customLabel: true, type: true, assigneeEmail: true, sourceMandate: true, clientBookable: true,
        activityType: { select: { code: true, nameFR: true, visualToken: true, iconKey: true } },
        projectId: true, project: { select: { name: true, clientId: true, buildingId: true,
          client: { select: { name: true } },
          building: { select: { name: true, timeZone: true, timeZoneVerified: true } } } },
        bookings: { select: { id: true, status: true } },
      }, take: MAX_CANDIDATES + 1 }),
      withCapacity ? this.capacity.getCapacityPlanning(actor.organizationId) : Promise.resolve([]),
    ]);
    if (bookings.length > MAX_CANDIDATES || activities.length > MAX_CANDIDATES) {
      throw new BadRequestException('Trop de résultats : réduire la période ou filtrer');
    }
    const capacityById = new Map(capacityRows.map(row => [row.userId, row]));
    const workIntervals: Array<{ userId: string; startUtc: Date; endUtc: Date; verified: boolean }> = [];
    const configured = new Set<string>();
    for (const schedule of schedules) {
      if (!schedule.verifiedAt) continue;
      try {
        const ranges = scheduleRanges(schedule.intervals, schedule.timeZone, window.startUtc, window.endUtc,
          schedule.effectiveFrom, schedule.effectiveUntil);
        if (ranges.validity.endUtc > ranges.validity.startUtc) configured.add(schedule.userId);
        for (const range of ranges.work) workIntervals.push({ userId: schedule.userId, ...range, verified: true });
      } catch { warnings.push(`Horaire ${schedule.id} impossible à projeter`); }
    }
    const userProjection = users.map(user => {
      const base = { id: user.id, name: `${user.firstName} ${user.lastName}`.trim(), title: user.title };
      if (own && user.id !== actor.userId) return { ...base, availability: 'GENERIC' };
      const capacity = capacityById.get(user.id);
      return { ...base, timeZone: user.timeZone, timeZoneVerified: user.timeZoneVerified,
        workScheduleConfigured: configured.has(user.id),
        capacity: capacity ? { label: 'Charge engagée — horizon 12 semaines',
          chargeEngagee: capacity.chargeEngagee, chargeProvisoire: capacity.chargeProvisoire,
          tauxUtilisationConfirmee: capacity.tauxUtilisationConfirmee } : null };
    });
    const events: any[] = [];
    const actions: Action[] = [];
    const slots: Array<{ key: string; userId: string; startUtc: Date; endUtc: Date; excludeBookingId: string }> = [];
    for (const booking of bookings) {
      if (!OPEN_BOOKING_STATUSES.includes(booking.status as any)) continue;
      let interval;
      try { interval = bookingInterval(booking); } catch { warnings.push(`Booking ${booking.id} : intervalle invalide`); continue; }
      if (!overlaps(window, interval)) continue;
      const assignments = booking.assignments.filter(a => ids.includes(a.userId));
      if (window.userIds && !assignments.length) continue;
      const relevant = !own || assignments.some(a => a.userId === actor.userId);
      const acceptedLead = booking.assignments.some(a => a.role === 'LEAD' && a.status === 'ACCEPTED');
      const needsAction = booking.status === 'DEMANDEE' || !acceptedLead || assignments.some(a => a.status === 'PENDING');
      if (relevant) {
        const detailed = !own || assignments.some(a => a.userId === actor.userId);
        events.push({ id: `booking:${booking.id}`, source: 'BOOKING', startUtc: interval.startUtc,
          endUtc: interval.endUtc, sourceTimeZone: interval.timeZone,
          userIds: assignments.map(a => a.userId), status: booking.status === 'DEMANDEE' ? 'REQUESTED' :
            assignments.some(a => a.status === 'PENDING') ? 'PROVISIONAL' : 'CONFIRMED',
          label: detailed ? booking.status === 'DEMANDEE' ? 'Demande client — non confirmée' :
            booking.activity?.customLabel || booking.activity?.label || booking.activityType : 'Occupé',
          ...(detailed ? { activityType: booking.activity?.activityType ?? (booking.activity ? {
            code: booking.activity.type, nameFR: booking.activity.label, visualToken: 'NEUTRAL', iconKey: null,
          } : { code: booking.activityType, nameFR: booking.activityType, visualToken: 'NEUTRAL', iconKey: null }) } : {}),
          ...(detailed ? { bookingId: booking.id, projectId: booking.projectId,
            buildingId: booking.project.buildingId, clientId: booking.project.clientId,
            projectName: booking.project.name, clientName: booking.project.client.name,
            buildingName: booking.project.building?.name,
            ownerName: `${booking.project.user.firstName} ${booking.project.user.lastName}`.trim(),
            bookingStatus: booking.status,
            assignments: assignments.map(assignment => ({ userId: assignment.userId,
              role: assignment.role, status: assignment.status })) } : {}),
          needsAction, warnings: interval.timeZoneVerified ? [] : ['Fuseau horaire du bâtiment à confirmer'] });
        if (booking.status === 'DEMANDEE') actions.push({ id: `requested:${booking.id}`, type: 'BOOKING_REQUESTED',
          groupId: booking.id, bookingId: booking.id, startUtc: interval.startUtc,
          label: 'Demande client — non confirmée', clientId: booking.project.clientId,
          buildingId: booking.project.buildingId });
        if (!acceptedLead) actions.push({ id: `lead:${booking.id}`, type: 'NO_ACCEPTED_LEAD', groupId: booking.id,
          bookingId: booking.id, startUtc: interval.startUtc, label: 'Aucun LEAD accepté',
          clientId: booking.project.clientId, buildingId: booking.project.buildingId });
        for (const assignment of assignments.filter(a => a.status === 'PENDING' && (!own || a.userId === actor.userId))) {
          actions.push({ id: `pending:${assignment.id}`, type: 'PENDING_ASSIGNMENT', groupId: booking.id,
            bookingId: booking.id, userId: assignment.userId, startUtc: interval.startUtc,
            label: 'Affectation en attente', clientId: booking.project.clientId,
            buildingId: booking.project.buildingId });
        }
      }
      for (const assignment of assignments.filter(a => !own || a.userId === actor.userId)) {
        slots.push({ key: `${booking.id}:${assignment.userId}`, userId: assignment.userId,
          startUtc: interval.startUtc, endUtc: interval.endUtc, excludeBookingId: booking.id });
      }
      // A colleague's booking is only a generic busy interval for an operator.
      if (own && !relevant) for (const assignment of assignments) events.push({
        id: `busy:${booking.id}:${assignment.userId}`, source: 'BOOKING', startUtc: interval.startUtc,
        endUtc: interval.endUtc, sourceTimeZone: interval.timeZone, userIds: [assignment.userId],
        status: 'BUSY', label: 'Occupé', needsAction: false, warnings: [],
      });
    }
    const uniqueSlotIds = [...new Set(slots.map(slot => slot.userId))];
    const signals = slots.length ? await this.scheduling.analyzeManySlots({ organizationId: actor.organizationId,
      userIds: uniqueSlotIds, startUtc: window.startUtc, endUtc: window.endUtc, slots }) : new Map();
    for (const slot of slots) {
      const result = signals.get(slot.key);
      if (!result || !['BLOCKED', 'UNKNOWN'].includes(result.status)) continue;
      const bookingId = slot.excludeBookingId;
      const type = result.status === 'BLOCKED' ? 'SCHEDULING_BLOCKED' : 'SCHEDULING_UNKNOWN';
      actions.push({ id: `${type}:${slot.key}`, type, groupId: bookingId, bookingId,
        userId: slot.userId, startUtc: slot.startUtc,
        label: type === 'SCHEDULING_BLOCKED' ? 'Conflit horaire' : 'Disponibilité à vérifier' });
      const event = events.find(item => item.bookingId === bookingId);
      if (event) { event.needsAction = true; event.warnings.push(...result.warnings); }
    }
    for (const absence of absences) events.push({ id: `absence:${absence.id}`, source: 'USER_UNAVAILABILITY',
      startUtc: absence.startAt, endUtc: absence.endAt, sourceTimeZone: absence.timeZone,
      userIds: [absence.userId], status: 'UNAVAILABLE', label: 'Indisponible', needsAction: false, warnings: [] });
    for (const activity of activities) {
      const userId = activity.assigneeEmail && emailToId.get(activity.assigneeEmail.toLowerCase());
      const interval = activityInterval(activity);
      if (userId && interval && !activity.bookings.length && overlaps(window, interval)) {
        const detail = !own || userId === actor.userId;
        events.push({ id: `legacy:${activity.id}`, source: 'LEGACY_ACTIVITY', startUtc: interval.startUtc,
          endUtc: interval.endUtc, sourceTimeZone: interval.timeZone, userIds: [userId],
          status: 'PROVISIONAL', label: detail ? activity.customLabel || activity.label : 'Occupé',
          ...(detail ? { activityType: activity.activityType ?? { code: activity.type, nameFR: activity.label,
            visualToken: 'NEUTRAL', iconKey: null } } : {}),
          ...(detail ? { activityId: activity.id, projectId: activity.projectId,
            buildingId: activity.project.buildingId, clientId: activity.project.clientId,
            projectName: activity.project.name, clientName: activity.project.client.name,
            buildingName: activity.project.building?.name } : {}),
          needsAction: false, warnings: [] });
      }
      if ((activity.clientBookable || activity.sourceMandate) &&
        !activity.bookings.some(booking => OPEN_BOOKING_STATUSES.includes(booking.status as any)) &&
        (!own || userId === actor.userId) && (!activity.scheduledDate || (interval && overlaps(window, interval)))) {
        actions.push({ id: `unplanned:${activity.id}`, type: 'UNPLANNED_ACTIVITY', groupId: activity.id,
          activityId: activity.id, userId: userId || undefined, startUtc: activity.scheduledDate,
          label: 'Activité à planifier', clientId: activity.project.clientId,
          buildingId: activity.project.buildingId });
      }
    }
    const summary = { requestedBookings: actions.filter(a => a.type === 'BOOKING_REQUESTED').length,
      bookingsWithoutAcceptedLead: actions.filter(a => a.type === 'NO_ACCEPTED_LEAD').length,
      pendingAssignments: actions.filter(a => a.type === 'PENDING_ASSIGNMENT').length,
      blockedConflicts: actions.filter(a => a.type === 'SCHEDULING_BLOCKED').length,
      unknownAvailability: actions.filter(a => a.type === 'SCHEDULING_UNKNOWN').length,
      unplannedActivities: actions.filter(a => a.type === 'UNPLANNED_ACTIVITY').length };
    return { asOf: new Date(), window, displayTimeZone, users: userProjection,
      workIntervals, events: query.needsAction === 'true' ? events.filter(event => event.needsAction) : events,
      actionSummary: summary, actions, warnings };
  }

  async team(query: PlanningWindowDto, actor: Actor) {
    const { actions, ...response } = await this.snapshot(query, actor, true);
    return { version: 1, ...response };
  }

  async actions(query: PlanningActionsDto, actor: Actor) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 25);
    if (!Number.isInteger(page) || page < 1 || page > 1000 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
      throw new BadRequestException('Pagination invalide');
    }
    const snapshot = await this.snapshot(query, actor, false);
    // userId has already restricted Users, Bookings, and Activities in SQL.
    // Booking-level actions have no single userId but still belong to that filter.
    const items = snapshot.actions.filter(item => !query.type || item.type === query.type);
    items.sort((a, b) => (a.startUtc?.getTime() ?? 0) - (b.startUtc?.getTime() ?? 0) || a.id.localeCompare(b.id));
    return { version: 1, asOf: snapshot.asOf, window: snapshot.window, page, limit,
      total: items.length, items: items.slice((page - 1) * limit, page * limit) };
  }
}
