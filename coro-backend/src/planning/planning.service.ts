import { BadRequestException, ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CapacityService } from '../mandate/capacity.service';
import { SchedulingService, bookingInterval, overlaps } from '../scheduling/scheduling.service';
import { effectiveBookingDate, OPEN_BOOKING_STATUSES } from '../bookings/booking-status';
import { assertIanaTimeZone } from '../bookings/booking-time';
import { parseActivityDurationHours } from '../mandate/capacity-duration';
import { scheduleRanges } from '../work-schedules/work-schedule-time';
import { CreatePlanningActivityDto, PlanningActionsDto, PlanningContextDto, PlanningTeamPreviewDto, PlanningWindowDto } from './planning.dto';
import { projectAccessWhere } from '../auth/project-access';
import { isOperationalActivityAudit } from './planning-activity-history';
import { ActivityTaskListsService } from '../activities/activity-task-lists.service';

type Actor = { userId: string; organizationId: string; role: string };
const DAY = 86_400_000;
const MAX_CANDIDATES = 2000;
type ActionType = 'BOOKING_REQUESTED' | 'NO_ACCEPTED_LEAD' | 'PENDING_ASSIGNMENT' |
  'SCHEDULING_BLOCKED' | 'SCHEDULING_UNKNOWN' | 'UNPLANNED_ACTIVITY';
type Action = { id: string; type: ActionType; groupId: string; bookingId?: string; activityId?: string;
  userId?: string; startUtc: Date | null; label: string; clientId?: string; buildingId?: string;
  projectId?: string; projectName?: string; clientName?: string; buildingName?: string; userName?: string;
  activityTypeId?: string; activityTypeName?: string; durationMinutes?: number;
  hasBookingHistory?: boolean; lastBookingId?: string; lastEffectiveStartUtc?: Date;
  lastDurationMinutes?: number; lastBookingStatus?: string;
  lastLead?: { userId: string; displayName: string }; removalAction?: 'DELETE' | 'CANCEL' };

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
    private readonly capacity: CapacityService,
    @Optional() private readonly activityTaskLists?: ActivityTaskListsService) {}

  async context(query: PlanningContextDto, actor: Actor) {
    staff(actor);
    const projectScope = projectAccessWhere(actor);
    const [clients, buildings, projects, activityTypes] = await Promise.all([
      this.prisma.client.findMany({ where: { organizationId: actor.organizationId, isActive: true,
        ...(actor.role === 'OPERATOR' ? { projects: { some: projectScope } } : {}) },
        select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      this.prisma.building.findMany({ where: { organizationId: actor.organizationId, isActive: true,
        ...(actor.role === 'OPERATOR' ? { projects: { some: projectScope } } : {}),
        ...(query.clientId ? { clientId: query.clientId } : {}) },
        select: { id: true, name: true, clientId: true, timeZone: true, timeZoneVerified: true },
        orderBy: { name: 'asc' } }),
      this.prisma.project.findMany({ where: { ...projectScope, isActive: true,
        ...(query.clientId ? { clientId: query.clientId } : {}),
        ...(query.buildingId ? { buildingId: query.buildingId } : {}) },
        select: { id: true, name: true, clientId: true, buildingId: true, status: true, year: true,
          user: { select: { id: true, firstName: true, lastName: true } },
          mandate: { select: { id: true, ownerId: true,
            owner: { select: { firstName: true, lastName: true } } } } },
        orderBy: [{ year: 'desc' }, { name: 'asc' }] }),
      this.prisma.activityType.findMany({ where: { isActive: true,
        OR: [{ organizationId: null }, { organizationId: actor.organizationId }] },
        select: { id: true, code: true, nameFR: true, defaultDurationMinutes: true,
          clientBookableDefault: true, displayOrder: true },
        orderBy: [{ displayOrder: 'asc' }, { nameFR: 'asc' }, { id: 'asc' }] }),
    ]);
    return { version: 1, clients, buildings, projects: projects.map(project => ({
      ...project, owner: project.mandate?.owner ?? project.user,
      mandateId: project.mandate?.id ?? null,
    })), activityTypes };
  }

  async createUnplannedActivity(dto: CreatePlanningActivityDto, actor: Actor) {
    staff(actor);
    const project = await this.prisma.project.findFirst({ where: {
      id: dto.projectId, isActive: true, ...projectAccessWhere(actor),
    }, select: { id: true } });
    if (!project) throw new BadRequestException('Mandat indisponible');
    const activityType = await this.prisma.activityType.findFirst({ where: {
      id: dto.activityTypeId, isActive: true,
      OR: [{ organizationId: null }, { organizationId: actor.organizationId }],
    } });
    if (!activityType) throw new BadRequestException("Type d'activite indisponible");
    const customLabel = dto.customLabel?.trim() || null;
    if (activityType.code === 'autre' && !customLabel) {
      throw new BadRequestException('Un libelle personnalise est requis pour Autre');
    }
    const clientVisible = dto.clientVisible ?? true;
    const clientBookable = dto.clientBookable ?? activityType.clientBookableDefault;
    if (!clientVisible && clientBookable) {
      throw new BadRequestException('Une activite reservable doit etre visible par le client');
    }
    return this.prisma.$transaction(async tx => {
      const minutes = activityType.defaultDurationMinutes;
      const activity = await tx.projectActivity.create({ data: {
        projectId: project.id, organizationId: actor.organizationId,
        type: activityType.code, activityTypeId: activityType.id, label: activityType.nameFR,
        duration: minutes ? `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}` : '',
        dureeHeures: minutes ? minutes / 60 : null, mode: dto.mode ?? 'presentiel',
        customLabel, notes: dto.notes?.trim() || null, scheduledDate: null,
        status: 'a_faire', sourceMandate: true, clientVisible, clientBookable,
      } });
      if (!this.activityTaskLists) throw new Error('ActivityTaskListsService indisponible');
      await this.activityTaskLists.instantiateMissingTaskListsForActivity(tx, project.id, activity.id, actor);
      await tx.auditLog.create({ data: {
        action: 'PLANNING_ACTIVITY_CREATED', entityType: 'ProjectActivity', entityId: activity.id,
        projectId: project.id, description: 'Activite creee depuis le Planner et ajoutee au backlog.',
        metadata: { activityTypeId: activityType.id, scheduled: false },
        userId: actor.userId, organizationId: actor.organizationId,
      } });
      return activity;
    });
  }

  async myAssignments(actor: Actor) {
    staff(actor);
    const assignments = await this.prisma.bookingAssignment.findMany({ where: {
      userId: actor.userId, status: 'PENDING',
      booking: { organizationId: actor.organizationId, status: { in: [...OPEN_BOOKING_STATUSES] } },
    }, select: {
      id: true, role: true, status: true,
      booking: { select: { id: true, requestedDate: true, reportedDate: true, duration: true,
        activityId: true, activityType: true,
        activity: { select: { label: true, customLabel: true,
          activityType: { select: { nameFR: true } } } },
        project: { select: { id: true, name: true,
          client: { select: { name: true } },
          building: { select: { name: true, timeZone: true } } } },
      } },
    }, orderBy: [{ assignedAt: 'asc' }, { id: 'asc' }] });
    const items = assignments.map(assignment => ({
      assignmentId: assignment.id,
      bookingId: assignment.booking.id,
      activityId: assignment.booking.activityId,
      role: assignment.role,
      assignmentStatus: assignment.status,
      requiresMyAction: true,
      title: assignment.booking.activity?.customLabel || assignment.booking.activity?.label || assignment.booking.activityType,
      activityType: assignment.booking.activity?.activityType?.nameFR || assignment.booking.activity?.label || assignment.booking.activityType,
      client: assignment.booking.project.client.name,
      building: assignment.booking.project.building?.name ?? null,
      project: assignment.booking.project.name,
      projectId: assignment.booking.project.id,
      effectiveStartUtc: effectiveBookingDate(assignment.booking),
      durationMinutes: assignment.booking.duration,
      timeZone: assignment.booking.project.building?.timeZone ?? 'America/Toronto',
    }));
    return { version: 1, asOf: new Date(), pendingCount: items.length, items };
  }

  async teamPreview(dto: PlanningTeamPreviewDto, actor: Actor) {
    staff(actor);
    const startUtc = new Date(dto.startUtc);
    if (!Number.isFinite(startUtc.getTime())) throw new BadRequestException('Date de debut invalide');
    const endUtc = new Date(startUtc.getTime() + dto.durationMinutes * 60_000);
    const building = await this.prisma.building.findFirst({ where: {
      id: dto.buildingId, organizationId: actor.organizationId, isActive: true,
    }, select: { id: true, timeZone: true, timeZoneVerified: true } });
    if (!building) throw new BadRequestException('Batiment indisponible');
    const users = await this.prisma.user.findMany({ where: {
      organizationId: actor.organizationId, isActive: true,
      role: { in: ['ADMIN', 'SUPER_ADMIN', 'OPERATOR'] },
      ...(actor.role === 'OPERATOR' ? { id: actor.userId } : {}),
    }, select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }] });
    const [availability, capacity] = await Promise.all([
      this.scheduling.analyzeUsers({ organizationId: actor.organizationId,
        userIds: users.map(user => user.id), startUtc, endUtc, targetBuildingId: building.id }),
      this.capacity.getCapacityPlanning(actor.organizationId),
    ]);
    const capacityByUser = new Map(capacity.map(row => [row.userId, row]));
    const rank = { AVAILABLE: 0, UNKNOWN: 1, BLOCKED: 2 } as const;
    const candidates = users.map(user => {
      const result = availability.get(user.id);
      if (!result) throw new BadRequestException('Disponibilite candidat introuvable');
      const availabilityStatus = result.status === 'AVAILABLE' ? 'AVAILABLE'
        : result.status === 'BLOCKED' ? 'BLOCKED' : 'UNKNOWN';
      const blocked = result.conflicts.find(conflict => conflict.severity === 'BLOCKED');
      let genericReason = availabilityStatus === 'AVAILABLE' ? 'Disponible'
        : result.status === 'SOFT_CONFLICT' ? 'Disponibilite a verifier - engagement provisoire.'
          : availabilityStatus === 'UNKNOWN'
            ? 'Disponibilite a verifier - horaire non configure ou non verifie.'
            : 'Indisponible';
      let blockedInterval: { startUtc: Date; endUtc: Date } | undefined;
      if (availabilityStatus === 'BLOCKED' && blocked) {
        genericReason = blocked.source === 'BOOKING' ? 'Deja engage sur ce creneau.'
          : blocked.source === 'WORK_SCHEDULE' ? 'Hors horaire de travail.' : 'Indisponible.';
        blockedInterval = { startUtc: blocked.startUtc, endUtc: blocked.endUtc };
      }
      const workload = capacityByUser.get(user.id);
      return { userId: user.id, displayName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email, availabilityStatus, genericReason, blockedInterval,
        capacityCommittedPercent: workload?.tauxUtilisationConfirmee ?? null,
        capacityHorizonWeeks: 12 };
    }).sort((a, b) => rank[a.availabilityStatus] - rank[b.availabilityStatus]
      || a.displayName.localeCompare(b.displayName, 'fr') || a.userId.localeCompare(b.userId));
    return { version: 1, slot: { startUtc, endUtc, durationMinutes: dto.durationMinutes,
      buildingId: building.id, timeZone: building.timeZone, timeZoneVerified: building.timeZoneVerified }, candidates };
  }

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
      role: { in: ['ADMIN', 'SUPER_ADMIN', 'OPERATOR'] },
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
    const userNames = new Map(users.map(user => [user.id, `${user.firstName} ${user.lastName}`.trim()]));
    const earliest = new Date(window.startUtc.getTime() - DAY);
    const [bookings, schedules, absences, activities, capacityRows] = await Promise.all([
      this.prisma.booking.findMany({ where: { organizationId: actor.organizationId,
        status: { in: query.bookingStatus ? [query.bookingStatus] : [...OPEN_BOOKING_STATUSES] },
        OR: [{ reportedDate: null, requestedDate: { gte: earliest, lt: window.endUtc } },
          { reportedDate: { gte: earliest, lt: window.endUtc } }],
        ...(query.clientId || query.buildingId || query.projectId ? { project: {
          ...(query.clientId ? { clientId: query.clientId } : {}),
          ...(query.buildingId ? { buildingId: query.buildingId } : {}),
          ...(query.projectId ? { id: query.projectId } : {}),
        } } : {}),
        ...(query.activityTypeId ? { activity: { activityTypeId: query.activityTypeId } } : {}),
        ...(filteredUsers ? { assignments: { some: { userId: { in: ids },
          status: { in: ['PENDING', 'ACCEPTED'] } } } } : {}),
      }, select: { id: true, requestedDate: true, reportedDate: true, duration: true, status: true,
        activityType: true, projectId: true, activity: { select: { id: true, type: true, customLabel: true, label: true, activityTypeId: true,
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
        ...(query.clientId || query.buildingId || query.projectId ? { project: {
          ...(query.clientId ? { clientId: query.clientId } : {}),
          ...(query.buildingId ? { buildingId: query.buildingId } : {}),
          ...(query.projectId ? { id: query.projectId } : {}),
        } } : {}),
        ...(query.activityTypeId ? { activityTypeId: query.activityTypeId } : {}),
        ...(filteredUsers ? { assigneeEmail: { in: users.map(user => user.email), mode: 'insensitive' as const } } : {}),
      }, select: { id: true, scheduledDate: true, duration: true, customDuration: true,
        label: true, customLabel: true, type: true, assigneeEmail: true, sourceMandate: true, clientBookable: true,
        activityTypeId: true,
        activityType: { select: { code: true, nameFR: true, visualToken: true, iconKey: true } },
        projectId: true, project: { select: { name: true, clientId: true, buildingId: true,
          client: { select: { name: true } },
          building: { select: { name: true, timeZone: true, timeZoneVerified: true } } } },
        exerciseReport: { select: { id: true } },
        taskLists: { where: { instantiationSource: 'ACTIVITY_TYPE_CONFIG' }, select: { id: true }, take: 1 },
        bookings: { orderBy: { createdAt: 'desc' }, select: { id: true, status: true, requestedDate: true,
          reportedDate: true, duration: true, createdAt: true,
          assignments: { where: { role: 'LEAD' }, orderBy: { assignedAt: 'desc' }, take: 1,
            select: { userId: true, user: { select: { firstName: true, lastName: true } } } } } },
      }, take: MAX_CANDIDATES + 1 }),
      withCapacity ? this.capacity.getCapacityPlanning(actor.organizationId) : Promise.resolve([]),
    ]);
    if (bookings.length > MAX_CANDIDATES || activities.length > MAX_CANDIDATES) {
      throw new BadRequestException('Trop de résultats : réduire la période ou filtrer');
    }
    const capacityById = new Map(capacityRows.map(row => [row.userId, row]));
    const activityAuditIds = new Set((await this.prisma.auditLog.findMany({ where: {
      organizationId: actor.organizationId, entityType: 'ProjectActivity',
      entityId: { in: activities.map(activity => activity.id) },
    }, select: { entityId: true, action: true } }))
      .filter(row => isOperationalActivityAudit(row.action))
      .map(row => row.entityId));
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
            activityId: booking.activity?.id, activityTypeId: booking.activity?.activityTypeId ?? undefined,
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
          buildingId: booking.project.buildingId, projectId: booking.projectId, projectName: booking.project.name,
            clientName: booking.project.client.name, buildingName: booking.project.building?.name });
        if (!acceptedLead) actions.push({ id: `lead:${booking.id}`, type: 'NO_ACCEPTED_LEAD', groupId: booking.id,
          bookingId: booking.id, startUtc: interval.startUtc, label: 'Aucun LEAD accepté',
          clientId: booking.project.clientId, buildingId: booking.project.buildingId, projectId: booking.projectId, projectName: booking.project.name,
            clientName: booking.project.client.name, buildingName: booking.project.building?.name });
        for (const assignment of assignments.filter(a => a.status === 'PENDING' && (!own || a.userId === actor.userId))) {
          actions.push({ id: `pending:${assignment.id}`, type: 'PENDING_ASSIGNMENT', groupId: booking.id,
            bookingId: booking.id, userId: assignment.userId, startUtc: interval.startUtc,
            label: 'Affectation en attente', userName: userNames.get(assignment.userId), clientId: booking.project.clientId,
            buildingId: booking.project.buildingId, projectId: booking.projectId, projectName: booking.project.name,
            clientName: booking.project.client.name, buildingName: booking.project.building?.name });
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
      const event = events.find(item => item.bookingId === bookingId);
      const affectedUser = users.find(user => user.id === slot.userId);
      actions.push({ id: `${type}:${slot.key}`, type, groupId: bookingId, bookingId,
        userId: slot.userId, userName: affectedUser ? `${affectedUser.firstName} ${affectedUser.lastName}`.trim() : undefined,
        startUtc: slot.startUtc, label: type === 'SCHEDULING_BLOCKED' ? 'Conflit horaire' : 'Disponibilite a verifier',
        activityId: event?.activityId, projectId: event?.projectId, projectName: event?.projectName,
        clientId: event?.clientId, clientName: event?.clientName,
        buildingId: event?.buildingId, buildingName: event?.buildingName });
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
        const lastBooking = activity.bookings.find(booking => !OPEN_BOOKING_STATUSES.includes(booking.status as any));
        const lastLead = lastBooking?.assignments[0];
        actions.push({ id: `unplanned:${activity.id}`, type: 'UNPLANNED_ACTIVITY', groupId: activity.id,
          activityId: activity.id, userId: userId || undefined, startUtc: activity.scheduledDate,
          label: activity.customLabel || activity.activityType?.nameFR || activity.label,
          clientId: activity.project.clientId, buildingId: activity.project.buildingId,
          projectId: activity.projectId, projectName: activity.project.name,
          clientName: activity.project.client.name, buildingName: activity.project.building?.name,
          activityTypeId: activity.activityTypeId || undefined,
          activityTypeName: activity.activityType?.nameFR || activity.label,
          hasBookingHistory: activity.bookings.length > 0,
          lastBookingId: lastBooking?.id,
          lastEffectiveStartUtc: lastBooking ? effectiveBookingDate(lastBooking) : undefined,
          lastDurationMinutes: lastBooking?.duration,
          lastBookingStatus: lastBooking?.status,
          lastLead: lastLead ? { userId: lastLead.userId,
            displayName: `${lastLead.user.firstName} ${lastLead.user.lastName}`.trim() } : undefined,
          removalAction: activity.bookings.length === 0 && !activity.exerciseReport && !(activity.taskLists?.length ?? 0) && !activityAuditIds.has(activity.id)
            ? 'DELETE' : 'CANCEL',
          durationMinutes: (() => { const hours = parseActivityDurationHours(activity.customDuration || activity.duration);
            return hours ? Math.round(hours * 60) : undefined; })() });
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
