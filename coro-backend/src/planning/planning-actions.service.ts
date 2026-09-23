import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { OPEN_BOOKING_STATUSES } from '../bookings/booking-status';
import { CreateAndPlanActivityDto, PlanExistingActivityDto, ReassignPlanningTeamDto, UpdatePlanningSlotDto } from './planning.dto';

type Actor = { userId: string; organizationId: string; role: string };
const ACTIVE_ASSIGNMENTS: Array<'PENDING' | 'ACCEPTED'> = ['PENDING', 'ACCEPTED'];

@Injectable()
export class PlanningActionsService {
  constructor(private readonly prisma: PrismaService, private readonly scheduling: SchedulingService) {}

  private manager(actor: Actor) {
    if (!actor?.organizationId || !actor.userId || !['ADMIN', 'SUPER_ADMIN'].includes(actor.role)) {
      throw new ForbiddenException('Mutations du Planner reservees aux administrateurs');
    }
  }

  private async lockActivity(tx: Prisma.TransactionClient, activityId: string, organizationId: string) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "ProjectActivity" WHERE "id" = ${activityId} AND "organizationId" = ${organizationId} FOR UPDATE
    `);
    if (!rows.length) throw new NotFoundException('Activite introuvable');
  }

  private async activityContext(tx: Prisma.TransactionClient, activityId: string, organizationId: string) {
    const activity = await tx.projectActivity.findFirst({ where: { id: activityId, organizationId },
      include: { project: { include: { building: true, client: true } } } });
    if (!activity) throw new NotFoundException('Activite introuvable');
    if (['annule', 'fait', 'termine'].includes(activity.status)) throw new BadRequestException('Cette activite ne peut plus etre planifiee');
    return activity;
  }

  private async clientUser(tx: Prisma.TransactionClient, clientId: string, organizationId: string, buildingId: string) {
    const clientUser = await tx.clientUser.findFirst({ where: { clientId, organizationId, isActive: true,
      OR: [{ buildingIds: { has: buildingId } }, { buildingIds: { isEmpty: true } }] }, orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (!clientUser) throw new BadRequestException('Aucun contact client actif ne permet de creer le Booking');
    return clientUser;
  }

  private team(dto: { leadUserId: string; supportUserIds?: string[] }) {
    const supportUserIds = dto.supportUserIds ?? [];
    if (supportUserIds.includes(dto.leadUserId)) throw new BadRequestException('Le LEAD ne peut pas etre SUPPORT');
    return { leadUserId: dto.leadUserId, supportUserIds, userIds: [dto.leadUserId, ...supportUserIds] };
  }

  private async validateTeam(tx: Prisma.TransactionClient, activity: any, input: {
    leadUserId: string; supportUserIds?: string[]; startUtc: Date; endUtc: Date; confirmUnknown?: boolean;
    excludeBookingId?: string;
  }) {
    const team = this.team(input);
    await this.scheduling.lockUsers(tx, activity.organizationId, team.userIds);
    const users = await tx.user.findMany({ where: { id: { in: team.userIds }, organizationId: activity.organizationId,
      isActive: true, role: { in: ['ADMIN', 'OPERATOR'] } }, select: { id: true, firstName: true, lastName: true } });
    if (users.length !== team.userIds.length) throw new BadRequestException('Un conseiller est inactif ou hors organisation');
    const results = await this.scheduling.analyzeUsers({ organizationId: activity.organizationId,
      userIds: team.userIds, startUtc: input.startUtc, endUtc: input.endUtc,
      excludeBookingId: input.excludeBookingId, targetBuildingId: activity.project.buildingId }, tx);
    for (const user of users) {
      const result = results.get(user.id);
      const name = `${user.firstName} ${user.lastName}`.trim();
      if (!result || result.status === 'BLOCKED') throw new BadRequestException(`${name} n'est plus disponible sur ce creneau.`);
      if (result.status !== 'AVAILABLE' && !input.confirmUnknown) {
        throw new BadRequestException(`${name} doit etre confirme explicitement car sa disponibilite reste a verifier.`);
      }
    }
    return team;
  }

  private async assertNoOpenBooking(tx: Prisma.TransactionClient, activityId: string) {
    const open = await tx.booking.findFirst({ where: { activityId, status: { in: OPEN_BOOKING_STATUSES } }, select: { id: true } });
    if (open) throw new ConflictException('Cette activite possede deja une planification active.');
  }

  private async createBooking(tx: Prisma.TransactionClient, activity: any, actor: Actor,
    input: PlanExistingActivityDto) {
    await this.assertNoOpenBooking(tx, activity.id);
    const startUtc = new Date(input.startUtc); const endUtc = new Date(startUtc.getTime() + input.durationMinutes * 60_000);
    const team = await this.validateTeam(tx, activity, { ...input, startUtc, endUtc });
    const contact = await this.clientUser(tx, activity.project.clientId, activity.organizationId, activity.project.buildingId);
    const booking = await tx.booking.create({ data: { activityId: activity.id, projectId: activity.projectId,
      organizationId: activity.organizationId, clientUserId: contact.id, assignedUserId: team.leadUserId,
      activityType: activity.type, requestedDate: startUtc, duration: input.durationMinutes, status: 'CONFIRMEE' } });
    const now = new Date();
    await tx.bookingAssignment.createMany({ data: [
      { bookingId: booking.id, userId: team.leadUserId, role: 'LEAD', status: 'PENDING', assignedByUserId: actor.userId, assignedAt: now },
      ...team.supportUserIds.map(userId => ({ bookingId: booking.id, userId, role: 'SUPPORT' as const,
        status: 'PENDING' as const, assignedByUserId: actor.userId, assignedAt: now })),
    ] });
    await tx.projectActivity.update({ where: { id: activity.id }, data: { scheduledDate: startUtc,
      duration: `${Math.floor(input.durationMinutes / 60)}h${String(input.durationMinutes % 60).padStart(2, '0')}`,
      dureeHeures: input.durationMinutes / 60 } });
    await tx.auditLog.create({ data: { action: 'PLANNED', entityType: 'ProjectActivity', entityId: activity.id,
      projectId: activity.projectId, description: 'Activite planifiee depuis le Planner.',
      metadata: { bookingId: booking.id, startUtc, durationMinutes: input.durationMinutes,
        leadUserId: team.leadUserId, supportUserIds: team.supportUserIds },
      userId: actor.userId, organizationId: actor.organizationId } });
    return { activityId: activity.id, bookingId: booking.id };
  }

  async planExisting(activityId: string, dto: PlanExistingActivityDto, actor: Actor) {
    this.manager(actor);
    return this.prisma.$transaction(async tx => {
      await this.lockActivity(tx, activityId, actor.organizationId);
      const activity = await this.activityContext(tx, activityId, actor.organizationId);
      return this.createBooking(tx, activity, actor, dto);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async createAndPlan(dto: CreateAndPlanActivityDto, actor: Actor) {
    this.manager(actor);
    return this.prisma.$transaction(async tx => {
      const project = await tx.project.findFirst({ where: { id: dto.projectId, organizationId: actor.organizationId, isActive: true },
        include: { building: true, client: true } });
      if (!project) throw new BadRequestException('Mandat indisponible');
      const type = await tx.activityType.findFirst({ where: { id: dto.activityTypeId, isActive: true,
        OR: [{ organizationId: null }, { organizationId: actor.organizationId }] } });
      if (!type) throw new BadRequestException("Type d'activite indisponible");
      const customLabel = dto.customLabel?.trim() || null;
      if (type.code === 'autre' && !customLabel) throw new BadRequestException('Un libelle personnalise est requis pour Autre');
      const clientVisible = dto.clientVisible ?? true;
      const clientBookable = dto.clientBookable ?? type.clientBookableDefault;
      if (!clientVisible && clientBookable) throw new BadRequestException('Une activite reservable doit etre visible par le client');
      const activity = await tx.projectActivity.create({ data: { projectId: project.id, organizationId: actor.organizationId,
        type: type.code, activityTypeId: type.id, label: type.nameFR, duration: '', dureeHeures: null,
        mode: dto.mode ?? 'presentiel', customLabel, notes: dto.notes?.trim() || null, scheduledDate: null,
        status: 'a_faire', sourceMandate: true, clientVisible, clientBookable } });
      return this.createBooking(tx, { ...activity, project }, actor, dto);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async updateSlot(bookingId: string, dto: UpdatePlanningSlotDto, actor: Actor) {
    this.manager(actor);
    return this.prisma.$transaction(async tx => {
      await this.scheduling.lockBooking(tx, actor.organizationId, bookingId);
      const booking = await tx.booking.findFirst({ where: { id: bookingId, organizationId: actor.organizationId,
        status: { in: OPEN_BOOKING_STATUSES } }, include: { activity: true, project: { include: { building: true, client: true } },
        assignments: { where: { status: { in: ACTIVE_ASSIGNMENTS } } } } });
      if (!booking || !booking.activity) throw new NotFoundException('Planification introuvable');
      const lead = booking.assignments.find(item => item.role === 'LEAD');
      if (!lead) throw new BadRequestException('Aucun LEAD actif');
      const startUtc = new Date(dto.startUtc); const endUtc = new Date(startUtc.getTime() + dto.durationMinutes * 60_000);
      await this.validateTeam(tx, { ...booking.activity, project: booking.project, organizationId: actor.organizationId }, {
        leadUserId: lead.userId, supportUserIds: booking.assignments.filter(item => item.role === 'SUPPORT').map(item => item.userId),
        startUtc, endUtc, confirmUnknown: dto.confirmUnknown, excludeBookingId: booking.id });
      const oldStart = booking.reportedDate ?? booking.requestedDate;
      const data = dto.reschedule ? { reportedDate: startUtc, status: 'REPORTEE' as const, duration: dto.durationMinutes }
        : { requestedDate: startUtc, reportedDate: null, duration: dto.durationMinutes };
      await tx.booking.update({ where: { id: booking.id }, data });
      await tx.projectActivity.update({ where: { id: booking.activity.id }, data: { scheduledDate: startUtc,
        ...(dto.reschedule ? { reportedDate: startUtc } : {}), dureeHeures: dto.durationMinutes / 60 } });
      await tx.auditLog.create({ data: { action: dto.reschedule ? 'RESCHEDULED' : 'SCHEDULE_UPDATED',
        entityType: 'ProjectActivity', entityId: booking.activity.id, projectId: booking.projectId,
        description: dto.reschedule ? 'Activite reportee depuis le Planner.' : 'Creneau modifie depuis le Planner.',
        metadata: { bookingId, oldStart, newStart: startUtc, durationMinutes: dto.durationMinutes },
        userId: actor.userId, organizationId: actor.organizationId } });
      return { activityId: booking.activity.id, bookingId };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async reassign(bookingId: string, dto: ReassignPlanningTeamDto, actor: Actor) {
    this.manager(actor);
    return this.prisma.$transaction(async tx => {
      await this.scheduling.lockBooking(tx, actor.organizationId, bookingId);
      const booking = await tx.booking.findFirst({ where: { id: bookingId, organizationId: actor.organizationId,
        status: { in: OPEN_BOOKING_STATUSES } }, include: { activity: true, project: { include: { building: true, client: true } },
        assignments: { where: { status: { in: ACTIVE_ASSIGNMENTS } } } } });
      if (!booking || !booking.activity) throw new NotFoundException('Planification introuvable');
      const startUtc = booking.reportedDate ?? booking.requestedDate;
      const endUtc = new Date(startUtc.getTime() + booking.duration * 60_000);
      const team = await this.validateTeam(tx, { ...booking.activity, project: booking.project, organizationId: actor.organizationId },
        { ...dto, startUtc, endUtc, excludeBookingId: booking.id });
      const now = new Date();
      const previousLead = booking.assignments.find(item => item.role === 'LEAD');
      await tx.bookingAssignment.updateMany({ where: { bookingId, status: { in: ACTIVE_ASSIGNMENTS } },
        data: { status: 'REPLACED', endedAt: now } });
      const nextLead = await tx.bookingAssignment.create({ data: {
        bookingId, userId: team.leadUserId, role: 'LEAD', status: 'PENDING',
        assignedByUserId: actor.userId, assignedAt: now,
      } });
      const nextSupports: Array<{ id: string; userId: string }> = [];
      for (const userId of team.supportUserIds) {
        nextSupports.push(await tx.bookingAssignment.create({ data: {
          bookingId, userId, role: 'SUPPORT', status: 'PENDING',
          assignedByUserId: actor.userId, assignedAt: now,
        } }));
      }
      if (previousLead) await tx.bookingAssignment.update({ where: { id: previousLead.id },
        data: { replacedByAssignmentId: nextLead.id } });
      for (const previousSupport of booking.assignments.filter(item => item.role === 'SUPPORT')) {
        const replacementSupport = nextSupports.find(item => item.userId === previousSupport.userId);
        if (replacementSupport) await tx.bookingAssignment.update({ where: { id: previousSupport.id },
          data: { replacedByAssignmentId: replacementSupport.id } });
      }      await tx.booking.update({ where: { id: bookingId }, data: { assignedUserId: team.leadUserId, status: 'REASSIGNEE' } });
      await tx.auditLog.create({ data: { action: 'TEAM_REASSIGNED', entityType: 'ProjectActivity', entityId: booking.activity.id,
        projectId: booking.projectId, description: 'Equipe reaffectee depuis le Planner.',
        metadata: { bookingId, newLead: team.leadUserId, supportUserIds: team.supportUserIds },
        userId: actor.userId, organizationId: actor.organizationId } });
      return { activityId: booking.activity.id, bookingId };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async cancelSchedule(bookingId: string, actor: Actor) {
    this.manager(actor);
    return this.prisma.$transaction(async tx => {
      await this.scheduling.lockBooking(tx, actor.organizationId, bookingId);
      const booking = await tx.booking.findFirst({ where: { id: bookingId, organizationId: actor.organizationId,
        status: { in: OPEN_BOOKING_STATUSES } }, include: { activity: true } });
      if (!booking?.activity) throw new NotFoundException('Planification introuvable');
      const now = new Date();
      await tx.booking.update({ where: { id: bookingId }, data: { status: 'ANNULEE' } });
      await tx.bookingAssignment.updateMany({ where: { bookingId, status: { in: ACTIVE_ASSIGNMENTS } },
        data: { status: 'REMOVED', endedAt: now } });
      await tx.projectActivity.update({ where: { id: booking.activity.id }, data: { scheduledDate: null, reportedDate: null } });
      await tx.auditLog.create({ data: { action: 'SCHEDULE_CANCELLED', entityType: 'ProjectActivity', entityId: booking.activity.id,
        projectId: booking.projectId, description: 'Planification annulee; activite conservee dans le backlog.',
        metadata: { bookingId }, userId: actor.userId, organizationId: actor.organizationId } });
      return { activityId: booking.activity.id, bookingId };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }
}
