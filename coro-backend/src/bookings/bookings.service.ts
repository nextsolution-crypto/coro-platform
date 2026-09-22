import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BOOKING_TRANSITIONS, OPEN_BOOKING_STATUSES, BookingStatus, effectiveBookingDate } from './booking-status';
import { Prisma } from '@prisma/client';
import { formatBuildingDate, resolveBookingInstant } from './booking-time';
import { SchedulingService, bookingInterval } from '../scheduling/scheduling.service';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService, private readonly scheduling: SchedulingService) {}

  async createBooking(data: {
    projectId: string;
    clientUserId: string;
    activityType: string;
    requestedDate?: Date;
    requestedLocalDateTime?: string;
    duration: number;
    participants?: number;
    comment?: string;
    activityId?: string;
  }) {
    if (!Number.isInteger(data.duration) || data.duration < 1) {
      throw new BadRequestException('Date ou durée invalide');
    }
    const project = await this.prisma.project.findUnique({
      where: { id: data.projectId },
      include: { user: true, client: true, building: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    const timeZone = project.building?.timeZone ?? 'America/Toronto';
    const requestedDate = resolveBookingInstant({ iso: data.requestedDate, localDateTime: data.requestedLocalDateTime }, timeZone);
    if (data.activityId) {
      const activity = await this.prisma.projectActivity.findFirst({ where: {
        id: data.activityId, projectId: data.projectId, organizationId: project.organizationId,
        clientVisible: true, clientBookable: true, status: { notIn: ['fait', 'termine', 'annule'] },
      } });
      if (!activity) throw new BadRequestException('Activité non réservable');
      const open = await this.prisma.booking.findFirst({ where: { activityId: data.activityId, status: { in: OPEN_BOOKING_STATUSES } } });
      if (open) throw new BadRequestException('Cette activité possède déjà une réservation ouverte');
    }

    const booking = await this.prisma.booking.create({
      data: {
        projectId: data.projectId,
        activityId: data.activityId,
        organizationId: project.organizationId,
        clientUserId: data.clientUserId,
        assignedUserId: project.userId,
        activityType: data.activityType,
        requestedDate,
        duration: data.duration,
        participants: data.participants,
        comment: data.comment,
        status: 'DEMANDEE',
        assignments: { create: { userId: project.userId, role: 'LEAD', status: 'ACCEPTED', respondedAt: new Date() } },
      },
      include: {
        project: { include: { client: true, building: true } },
        assignedUser: true,
        clientUser: true,
      },
    });

    // Notifier le conseiller par courriel
    await this.sendBookingEmail({
      to: booking.assignedUser.email,
      toName: `${booking.assignedUser.firstName} ${booking.assignedUser.lastName}`,
      subject: `📅 Nouvelle demande de réservation — ${project.name}`,
      content: this.safeHtml`
        <p>Le client <strong>${booking.clientUser.firstName} ${booking.clientUser.lastName}</strong> a soumis une demande de réservation.</p>
        <div style="background:#F8F9FA;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="margin:0 0 8px;"><strong>Projet :</strong> ${project.name}</p>
          <p style="margin:0 0 8px;"><strong>Activité :</strong> ${this.activityLabel(data.activityType)}</p>
          <p style="margin:0 0 8px;"><strong>Date demandée :</strong> ${formatBuildingDate(requestedDate, timeZone)}</p>
          <p style="margin:0 0 8px;"><strong>Durée :</strong> ${data.duration} minutes</p>
          ${data.participants ? this.trustedHtml(`<p style="margin:0 0 8px;"><strong>Participants :</strong> ${data.participants}</p>`) : ''}
          ${data.comment ? this.trustedHtml(`<p style="margin:0;"><strong>Commentaire :</strong> ${this.escapeHtml(data.comment)}</p>`) : ''}
        </div>
        <a href="https://app.getcoro.io/projects/${project.id}" style="display:inline-block;background:#C0392B;color:#FFFFFF;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700;">
          Voir la demande →
        </a>
      `,
    });

    return booking;
  }

  async getBookingsForProject(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, organizationId } });
    if (!project) throw new NotFoundException('Projet introuvable');
    return this.prisma.booking.findMany({
      where: { projectId, organizationId },
      include: {
        clientUser: { select: { firstName: true, lastName: true, email: true } },
        assignedUser: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { requestedDate: 'asc' },
    });
  }

  async getBookingsForOrganization(organizationId: string) {
    return this.prisma.booking.findMany({
      where: { organizationId },
      include: {
        project: { include: { client: true, building: true } },
        clientUser: { select: { firstName: true, lastName: true, email: true } },
        assignedUser: { select: { firstName: true, lastName: true, email: true } },
        assignments: {
          where: { status: { in: ['PENDING', 'ACCEPTED'] } },
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
          orderBy: { assignedAt: 'asc' },
        },
      },
      orderBy: { requestedDate: 'asc' },
    });
  }

  async getBookingsForClient(clientUserId: string) {
    return this.prisma.booking.findMany({
      where: { clientUserId },
      include: {
        project: { include: { client: true, building: true } },
        assignedUser: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { requestedDate: 'asc' },
    });
  }

  async getBookingForClientCancellation(bookingId: string, clientUserId: string, organizationId: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id: bookingId, clientUserId, organizationId }, select: { projectId: true } });
    if (!booking) throw new NotFoundException('Réservation introuvable');
    return booking;
  }

  async updateBookingStatus(bookingId: string, data: {
    status: string;
    refuseReason?: string;
    reportedDate?: Date;
    reportedLocalDateTime?: string;
    newUserId?: string;
    allowConflict?: boolean;
  }, organizationId: string, actor?: { userId: string; role: string }) {
    let booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, organizationId },
      include: {
        project: { include: { client: true, building: true } },
        clientUser: true,
        assignedUser: true,
      },
    });
    if (!booking) throw new NotFoundException('Réservation introuvable');
    const timeZone = booking.project.building?.timeZone ?? 'America/Toronto';
    const reportedDate = data.status === 'REPORTEE'
      ? resolveBookingInstant({ iso: data.reportedDate, localDateTime: data.reportedLocalDateTime }, timeZone)
      : undefined;

    if (!(data.status in BOOKING_TRANSITIONS) || !BOOKING_TRANSITIONS[booking.status as BookingStatus]?.includes(data.status as BookingStatus)) {
      throw new BadRequestException('Transition de réservation non autorisée');
    }
    if (data.status !== 'REPORTEE' && (data.reportedDate || data.reportedLocalDateTime)) throw new BadRequestException('Date de report non permise');
    if (data.status === 'REASSIGNEE' && !data.newUserId) throw new BadRequestException('Conseiller requis');
    if (data.newUserId && data.status !== 'REASSIGNEE') throw new BadRequestException('Conseiller seulement permis pour une réassignation');
    if (data.status === 'REFUSEE' && !data.refuseReason?.trim()) throw new BadRequestException('Motif de refus requis');
    if (data.newUserId) {
      const user = await this.prisma.user.findFirst({ where: { id: data.newUserId, organizationId, isActive: true } });
      if (!user) throw new BadRequestException('Conseiller invalide');
    }
    if (data.status === 'REASSIGNEE' && actor?.role !== 'ADMIN' && actor?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Réassignation réservée aux administrateurs');
    }
    if (data.allowConflict && actor?.role !== 'ADMIN' && actor?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Override réservé aux administrateurs');
    }

    let schedulingWarnings: string[] = [];
    let overriddenUserIds: string[] = [];
    if (data.status === 'CONFIRMEE' || data.status === 'REPORTEE') {
      const interval = bookingInterval({ ...booking, reportedDate: reportedDate ?? booking.reportedDate });
      const assignments = await this.prisma.bookingAssignment.findMany({ where: { bookingId,
        status: { in: ['ACCEPTED', 'PENDING'] } }, select: { userId: true, status: true } });
      const userIds = [...new Set(assignments.map(a => a.userId))];
      const analyses = await this.scheduling.analyzeUsers({ organizationId, userIds, startUtc: interval.startUtc,
        endUtc: interval.endUtc, excludeBookingId: bookingId, targetBuildingId: booking.project.buildingId });
      for (const assignment of assignments) {
        const analysis = analyses.get(assignment.userId);
        if (!analysis) continue;
        if (assignment.status === 'ACCEPTED' && analysis.status === 'BLOCKED') {
          if (!data.allowConflict) throw new BadRequestException({ message: 'Conflit confirmé sur une affectation acceptée',
            availabilityStatus: 'BLOCKED', userId: assignment.userId, conflicts: analysis.conflicts, warnings: analysis.warnings });
          overriddenUserIds.push(assignment.userId);
        }
        schedulingWarnings.push(...analysis.warnings);
        if (analysis.conflicts.length) schedulingWarnings.push(`${assignment.userId} : ${analysis.conflicts.map(c => c.reason).join(', ')}`);
      }
    }
    if (data.status === 'REASSIGNEE' && data.newUserId) {
      const interval = bookingInterval(booking);
      const analysis = await this.scheduling.analyzeUser({ organizationId, userId: data.newUserId,
        startUtc: interval.startUtc, endUtc: interval.endUtc, excludeBookingId: bookingId,
        targetBuildingId: booking.project.buildingId });
      if (analysis.status === 'BLOCKED' && !data.allowConflict) throw new BadRequestException({
        message: 'Conflit confirmé pour le remplaçant', availabilityStatus: 'BLOCKED',
        userId: data.newUserId, conflicts: analysis.conflicts, warnings: analysis.warnings });
      if (analysis.status === 'BLOCKED') overriddenUserIds.push(data.newUserId);
      schedulingWarnings.push(...analysis.warnings);
      if (analysis.conflicts.length) schedulingWarnings.push(`${data.newUserId} : ${analysis.conflicts.map(c => c.reason).join(', ')}`);
    }

    const updateData: any = { status: data.status };
    if (data.refuseReason) updateData.refuseReason = data.refuseReason;
    if (reportedDate) updateData.reportedDate = reportedDate;
    if (data.newUserId) updateData.assignedUserId = data.newUserId;

    const include = {
      project: { include: { client: true, building: true } },
      clientUser: true,
      assignedUser: true,
    } as const;
    const recordOverride = async (tx: Prisma.TransactionClient) => {
      if (!overriddenUserIds.length || !actor) return;
      await tx.notification.create({ data: {
        userId: actor.userId, organizationId, projectId: booking!.projectId,
        type: 'BOOKING_SCHEDULING_OVERRIDE', title: 'Conflit Booking contourné',
        message: `Booking ${bookingId} : conflit confirmé contourné pour ${overriddenUserIds.join(', ')} par ${actor.userId}`,
      } });
    };
    const recheckScheduling = async (tx: Prisma.TransactionClient) => {
      await this.scheduling.lockBooking(tx, organizationId, bookingId);
      const current = await tx.booking.findFirst({ where: { id: bookingId, organizationId }, include });
      if (!current) throw new NotFoundException('Réservation introuvable');
      if (!BOOKING_TRANSITIONS[current.status as BookingStatus]?.includes(data.status as BookingStatus)) {
        throw new BadRequestException('Transition de réservation non autorisée');
      }
      booking = current;
      schedulingWarnings = [];
      overriddenUserIds = [];
      if (data.status === 'CONFIRMEE' || data.status === 'REPORTEE') {
        const assignments = await tx.bookingAssignment.findMany({ where: { bookingId,
          status: { in: ['ACCEPTED', 'PENDING'] } }, select: { userId: true, status: true } });
        const userIds = [...new Set(assignments.map(a => a.userId))];
        await this.scheduling.lockUsers(tx, organizationId, userIds);
        const interval = bookingInterval({ ...current, reportedDate: reportedDate ?? current.reportedDate });
        const analyses = await this.scheduling.analyzeUsers({ organizationId, userIds, startUtc: interval.startUtc,
          endUtc: interval.endUtc, excludeBookingId: bookingId, targetBuildingId: current.project.buildingId }, tx);
        for (const assignment of assignments) {
          const analysis = analyses.get(assignment.userId);
          if (!analysis) continue;
          if (assignment.status === 'ACCEPTED' && analysis.status === 'BLOCKED') {
            if (!data.allowConflict) throw new BadRequestException({ message: 'Conflit confirmé sur une affectation acceptée',
              availabilityStatus: 'BLOCKED', userId: assignment.userId, conflicts: analysis.conflicts, warnings: analysis.warnings });
            overriddenUserIds.push(assignment.userId);
          }
          schedulingWarnings.push(...analysis.warnings);
          if (analysis.conflicts.length) schedulingWarnings.push(`${assignment.userId} : ${analysis.conflicts.map(c => c.reason).join(', ')}`);
        }
      } else if (data.status === 'REASSIGNEE' && data.newUserId) {
        await this.scheduling.lockUsers(tx, organizationId, [data.newUserId]);
        const interval = bookingInterval(current);
        const analysis = await this.scheduling.analyzeUser({ organizationId, userId: data.newUserId,
          startUtc: interval.startUtc, endUtc: interval.endUtc, excludeBookingId: bookingId,
          targetBuildingId: current.project.buildingId }, tx);
        if (analysis.status === 'BLOCKED' && !data.allowConflict) throw new BadRequestException({
          message: 'Conflit confirmé pour le remplaçant', availabilityStatus: 'BLOCKED',
          userId: data.newUserId, conflicts: analysis.conflicts, warnings: analysis.warnings });
        if (analysis.status === 'BLOCKED') overriddenUserIds.push(data.newUserId);
        schedulingWarnings.push(...analysis.warnings);
        if (analysis.conflicts.length) schedulingWarnings.push(`${data.newUserId} : ${analysis.conflicts.map(c => c.reason).join(', ')}`);
      }
      return current;
    };
    const updated = data.status === 'REASSIGNEE' && data.newUserId
      ? await this.prisma.$transaction(async tx => {
          await recheckScheduling(tx);
          const previous = await tx.bookingAssignment.findFirst({ where: { bookingId, role: 'LEAD', status: { in: ['PENDING', 'ACCEPTED'] } } });
          if (previous?.userId === data.newUserId) throw new BadRequestException('Conseiller déjà affecté');
          const now = new Date();
          if (previous) await tx.bookingAssignment.update({ where: { id: previous.id }, data: { status: 'REPLACED', endedAt: now } });
          const next = await tx.bookingAssignment.create({ data: {
            bookingId, userId: data.newUserId!, role: 'LEAD', status: 'ACCEPTED',
            assignedAt: now, respondedAt: now, assignedByUserId: actor?.userId,
          } });
          if (previous) await tx.bookingAssignment.update({ where: { id: previous.id }, data: { replacedByAssignmentId: next.id } });
          const result = await tx.booking.update({ where: { id: bookingId }, data: updateData, include });
          await recordOverride(tx);
          return result;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted })
      : (data.status === 'CONFIRMEE' || data.status === 'REPORTEE')
        ? await this.prisma.$transaction(async tx => {
            const current = await recheckScheduling(tx);
            const result = await tx.booking.update({ where: { id: bookingId }, data: updateData, include });
            if (current.activityId) {
              const effectiveDate = effectiveBookingDate(result);
              await tx.projectActivity.update({ where: { id: current.activityId }, data: {
                scheduledDate: effectiveDate,
                ...(data.status === 'REPORTEE' ? { reportedDate: effectiveDate } : {}),
              } });
            }
            await recordOverride(tx);
            return result;
          }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted })
        : await this.prisma.booking.update({ where: { id: bookingId }, data: updateData, include });

    // Notifier le client selon le statut
    const actLabel = this.activityLabel(booking.activityType);
    const dateLabel = formatBuildingDate(effectiveBookingDate(booking), timeZone);

    if (data.status === 'CONFIRMEE') {
      const icsContent = this.generateIcs({
        title: `${actLabel} — ${booking.project.name}`,
        description: `Réservation CORO\nActivité : ${actLabel}\nProjet : ${booking.project.name}\nBâtiment : ${booking.project.building?.name || ''}\nConseiller : ${updated.assignedUser.firstName} ${updated.assignedUser.lastName}`,
        startDate: effectiveBookingDate(booking),
        bookingId,
        sequence: booking.reportedDate ? 1 : 0,
        durationMinutes: booking.duration,
        location: booking.project.building?.address || '',
        organizerEmail: updated.assignedUser.email,
        organizerName: `${updated.assignedUser.firstName} ${updated.assignedUser.lastName}`,
        attendeeEmail: booking.clientUser.email,
        attendeeName: `${booking.clientUser.firstName} ${booking.clientUser.lastName}`,
      });

      // Envoyer au client
      await this.sendBookingEmail({
        to: booking.clientUser.email,
        toName: `${booking.clientUser.firstName} ${booking.clientUser.lastName}`,
        subject: `✅ Réservation confirmée — ${actLabel}`,
        content: this.safeHtml`
          <p>Votre demande de réservation a été <strong>confirmée</strong> par votre conseiller.</p>
          <div style="background:#EAFAF1;border:1px solid #A9DFBF;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="margin:0 0 8px;color:#27AE60;font-weight:700;">✓ Réservation confirmée</p>
            <p style="margin:0 0 8px;"><strong>Activité :</strong> ${actLabel}</p>
            <p style="margin:0 0 8px;"><strong>Date :</strong> ${dateLabel}</p>
            <p style="margin:0;"><strong>Conseiller :</strong> ${updated.assignedUser.firstName} ${updated.assignedUser.lastName}</p>
          </div>
          <p style="color:#6C757D;font-size:13px;">Vous recevrez un rappel 7 jours et 24 heures avant la date.</p>
        `,
        ics: { content: icsContent, filename: `reservation-${actLabel.replace(/[^a-z0-9]/gi, '-')}.ics` },
      });

      // Envoyer au conseiller aussi
      await this.sendBookingEmail({
        to: updated.assignedUser.email,
        toName: `${updated.assignedUser.firstName} ${updated.assignedUser.lastName}`,
        subject: `📅 Réservation confirmée — ${actLabel} — ${booking.project.name}`,
        content: this.safeHtml`
          <p>Vous avez confirmé une réservation. L'événement est joint à ce courriel.</p>
          <div style="background:#EAFAF1;border:1px solid #A9DFBF;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="margin:0 0 8px;color:#27AE60;font-weight:700;">✓ Réservation confirmée</p>
            <p style="margin:0 0 8px;"><strong>Activité :</strong> ${actLabel}</p>
            <p style="margin:0 0 8px;"><strong>Date :</strong> ${dateLabel}</p>
            <p style="margin:0 0 8px;"><strong>Client :</strong> ${booking.clientUser.firstName} ${booking.clientUser.lastName}</p>
            <p style="margin:0;"><strong>Projet :</strong> ${booking.project.name}</p>
          </div>
        `,
        ics: { content: icsContent, filename: `reservation-${actLabel.replace(/[^a-z0-9]/gi, '-')}.ics` },
      });
    } else if (data.status === 'REFUSEE') {
      await this.sendBookingEmail({
        to: booking.clientUser.email,
        toName: `${booking.clientUser.firstName} ${booking.clientUser.lastName}`,
        subject: `❌ Demande de réservation refusée — ${actLabel}`,
        content: this.safeHtml`
          <p>Votre demande de réservation n'a pas pu être acceptée.</p>
          <div style="background:#FDEDEC;border:1px solid #F1948A;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="margin:0 0 8px;"><strong>Activité :</strong> ${actLabel}</p>
            <p style="margin:0 0 8px;"><strong>Date demandée :</strong> ${dateLabel}</p>
            ${data.refuseReason ? this.trustedHtml(`<p style="margin:0;"><strong>Motif :</strong> ${this.escapeHtml(data.refuseReason)}</p>`) : ''}
          </div>
          <p>Vous pouvez soumettre une nouvelle demande avec une autre date depuis votre portail.</p>
        `,
      });
    } else if (data.status === 'REPORTEE' && reportedDate) {
      const newDateLabel = formatBuildingDate(reportedDate, timeZone);

      const icsReport = this.generateIcs({
        title: `${actLabel} — ${booking.project.name}`,
        description: `Réservation CORO (reportée)\nActivité : ${actLabel}\nProjet : ${booking.project.name}\nBâtiment : ${booking.project.building?.name || ''}\nConseiller : ${updated.assignedUser.firstName} ${updated.assignedUser.lastName}`,
        startDate: effectiveBookingDate(updated),
        bookingId,
        sequence: 1,
        durationMinutes: booking.duration,
        location: booking.project.building?.address || '',
        organizerEmail: updated.assignedUser.email,
        organizerName: `${updated.assignedUser.firstName} ${updated.assignedUser.lastName}`,
        attendeeEmail: booking.clientUser.email,
        attendeeName: `${booking.clientUser.firstName} ${booking.clientUser.lastName}`,
      });

      await this.sendBookingEmail({
        to: booking.clientUser.email,
        toName: `${booking.clientUser.firstName} ${booking.clientUser.lastName}`,
        subject: `📅 Réservation reportée — ${actLabel}`,
        content: this.safeHtml`
          <p>Votre réservation a été <strong>reportée</strong> à une nouvelle date.</p>
          <div style="background:#FEF9E7;border:1px solid #FAD7A0;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="margin:0 0 8px;"><strong>Activité :</strong> ${actLabel}</p>
            <p style="margin:0 0 8px;text-decoration:line-through;color:#ADB5BD;"><strong>Date initiale :</strong> ${dateLabel}</p>
            <p style="margin:0;color:#F39C12;font-weight:700;"><strong>Nouvelle date :</strong> ${newDateLabel}</p>
          </div>
        `,
        ics: { content: icsReport, filename: `reservation-reportee-${actLabel.replace(/[^a-z0-9]/gi, '-')}.ics` },
      });

      await this.sendBookingEmail({
        to: updated.assignedUser.email,
        toName: `${updated.assignedUser.firstName} ${updated.assignedUser.lastName}`,
        subject: `📅 Réservation reportée — ${actLabel} — ${booking.project.name}`,
        content: this.safeHtml`
          <p>Vous avez reporté une réservation. L'événement mis à jour est joint à ce courriel.</p>
          <div style="background:#FEF9E7;border:1px solid #FAD7A0;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="margin:0 0 8px;"><strong>Activité :</strong> ${actLabel}</p>
            <p style="margin:0 0 8px;text-decoration:line-through;color:#ADB5BD;"><strong>Date initiale :</strong> ${dateLabel}</p>
            <p style="margin:0;color:#F39C12;font-weight:700;"><strong>Nouvelle date :</strong> ${newDateLabel}</p>
            <p style="margin:8px 0 0;"><strong>Client :</strong> ${booking.clientUser.firstName} ${booking.clientUser.lastName}</p>
          </div>
        `,
        ics: { content: icsReport, filename: `reservation-reportee-${actLabel.replace(/[^a-z0-9]/gi, '-')}.ics` },
      });
    } else if (data.status === 'REASSIGNEE' && data.newUserId) {
      const newUser = await this.prisma.user.findUnique({ where: { id: data.newUserId } });
      if (newUser) {
        await this.sendBookingEmail({
          to: booking.clientUser.email,
          toName: `${booking.clientUser.firstName} ${booking.clientUser.lastName}`,
          subject: `👤 Conseiller changé pour votre réservation`,
          content: this.safeHtml`
            <p>Un nouveau conseiller a été assigné à votre réservation.</p>
            <div style="background:#F4ECF7;border:1px solid #D2B4DE;padding:16px;border-radius:8px;margin:16px 0;">
              <p style="margin:0 0 8px;"><strong>Activité :</strong> ${actLabel}</p>
              <p style="margin:0 0 8px;"><strong>Date :</strong> ${dateLabel}</p>
              <p style="margin:0;"><strong>Nouveau conseiller :</strong> ${newUser.firstName} ${newUser.lastName}</p>
            </div>
          `,
        });
      }
    }

    return { ...updated, schedulingWarnings };
  }

  async cancelBooking(bookingId: string, cancelledBy: 'client' | 'conseiller', organizationId: string, clientUserId?: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, organizationId, ...(clientUserId ? { clientUserId } : {}) },
      include: { clientUser: true, assignedUser: true, project: { include: { building: true } } },
    });
    if (!booking) throw new NotFoundException('Réservation introuvable');
    if (!BOOKING_TRANSITIONS[booking.status as BookingStatus]?.includes('ANNULEE')) throw new BadRequestException('Annulation non autorisée');

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'ANNULEE' },
    });

    const actLabel = this.activityLabel(booking.activityType);
    const dateLabel = formatBuildingDate(effectiveBookingDate(booking), booking.project.building?.timeZone ?? 'America/Toronto');

    // Notifier l'autre partie
    const notifyEmail = cancelledBy === 'client' ? booking.assignedUser.email : booking.clientUser.email;
    const notifyName = cancelledBy === 'client'
      ? `${booking.assignedUser.firstName} ${booking.assignedUser.lastName}`
      : `${booking.clientUser.firstName} ${booking.clientUser.lastName}`;

    await this.sendBookingEmail({
      to: notifyEmail,
      toName: notifyName,
      subject: `❌ Réservation annulée — ${actLabel}`,
      content: this.safeHtml`
        <p>La réservation suivante a été <strong>annulée</strong> par ${cancelledBy === 'client' ? 'le client' : 'le conseiller'}.</p>
        <div style="background:#FDEDEC;border:1px solid #F1948A;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="margin:0 0 8px;"><strong>Activité :</strong> ${actLabel}</p>
          <p style="margin:0;"><strong>Date :</strong> ${dateLabel}</p>
        </div>
      `,
    });

    return { success: true };
  }

  private activityLabel(type: string): string {
    const labels: Record<string, string> = {
      exercice: 'Exercice d\'évacuation',
      formation: 'Formation',
      visite: 'Visite de suivi',
      revision: 'Révision documentaire',
      autre: 'Autre activité',
    };
    return labels[type] || type;
  }

  private escapeHtml(value: unknown): string {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
  }

  private trustedHtml(value: string): { html: string } { return { html: value }; }

  private safeHtml(parts: TemplateStringsArray, ...values: unknown[]): string {
    return parts.reduce((result, part, index) => result + part + (index < values.length ? (typeof values[index] === 'object' && values[index] !== null && 'html' in values[index] ? (values[index] as { html: string }).html : this.escapeHtml(values[index])) : ''), '');
  }

  private generateIcs(data: {
    bookingId: string;
    sequence: number;
    title: string;
    description: string;
    startDate: Date;
    durationMinutes: number;
    location?: string;
    organizerEmail: string;
    organizerName: string;
    attendeeEmail: string;
    attendeeName: string;
  }): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatDate = (d: Date) => {
      return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
    };
    const endDate = new Date(data.startDate.getTime() + data.durationMinutes * 60000);
    const uid = `${data.bookingId}@getcoro.io`;
    const now = formatDate(new Date());

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CORO//Réservation//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${formatDate(data.startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${data.title}`,
      `DESCRIPTION:${data.description.replace(/\n/g, '\\n')}`,
      data.location ? `LOCATION:${data.location}` : '',
      `ORGANIZER;CN=${data.organizerName}:mailto:${data.organizerEmail}`,
      `ATTENDEE;CN=${data.attendeeName};RSVP=TRUE:mailto:${data.attendeeEmail}`,
      'STATUS:CONFIRMED',
      `SEQUENCE:${data.sequence}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');
  }

  private async sendBookingEmail(data: {
    to: string;
    toName: string;
    subject: string;
    content: string;
    ics?: { content: string; filename: string };
  }) {
    try {
      const body: any = {
        sender: { name: 'CORO', email: 'info@getcoro.io' },
        to: [{ email: data.to, name: data.toName }],
        subject: data.subject,
        htmlContent: `
          <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#2C3E50;padding:24px;border-radius:8px 8px 0 0;">
              <span style="color:#FFFFFF;font-size:28px;font-weight:900;">CO<span style="color:#C0392B;">RO</span></span>
            </div>
            <div style="background:#FFFFFF;padding:32px;border:1px solid #E9ECEF;border-radius:0 0 8px 8px;">
              ${data.content}
              ${data.ics ? `
              <div style="margin-top:24px;padding:16px;background:#F8F9FA;border-radius:8px;border:1px solid #E9ECEF;">
                <p style="margin:0;font-size:13px;color:#6C757D;">
                  📅 <strong>Ajouter à votre calendrier</strong> — Un fichier calendrier (.ics) est joint à ce courriel. 
                  Ouvrez-le pour ajouter automatiquement cet événement à Outlook, Google Calendar ou Apple Calendar.
                </p>
              </div>` : ''}
            </div>
            <div style="text-align:center;padding:16px;font-size:12px;color:#ADB5BD;">
              © 2026 CORO — <a href="https://getcoro.io" style="color:#ADB5BD;">getcoro.io</a>
            </div>
          </div>
        `,
      };

      if (data.ics) {
        body.attachment = [{
          name: data.ics.filename,
          content: Buffer.from(data.ics.content).toString('base64'),
        }];
      }

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY || '' },
        body: JSON.stringify(body),
      });
      if (!response.ok) console.error(`Erreur email réservation Brevo: HTTP ${response.status}`);
    } catch (e) { console.error('Erreur email réservation:', e); }
  }
}
