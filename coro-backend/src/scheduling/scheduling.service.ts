import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { effectiveBookingDate } from '../bookings/booking-status';
import { parseActivityDurationHours } from '../mandate/capacity-duration';
import { scheduleRanges, uncovered } from '../work-schedules/work-schedule-time';

export type AvailabilityStatus = 'AVAILABLE' | 'SOFT_CONFLICT' | 'BLOCKED' | 'UNKNOWN';
export type SchedulingSource = 'BOOKING' | 'LEGACY_ACTIVITY' | 'USER_UNAVAILABILITY' | 'WORK_SCHEDULE' | 'MICROSOFT_CALENDAR' | 'TRAVEL';
export type SchedulingConflict = {
  severity: 'BLOCKED' | 'SOFT_CONFLICT'; source: SchedulingSource; sourceId: string;
  bookingId?: string; activityId?: string; startUtc: Date; endUtc: Date;
  timeZone: string; label: string; reason: string;
};
export type AvailabilityResult = {
  status: AvailabilityStatus; conflicts: SchedulingConflict[]; warnings: string[];
  sourcesChecked: SchedulingSource[];
};
export type SchedulingInterval = { startUtc: Date; endUtc: Date; timeZone: string; timeZoneVerified: boolean };

export function bookingAssignmentSeverity(assignmentStatus: string, bookingStatus: string): 'BLOCKED' | 'SOFT_CONFLICT' | null {
  if (!['PENDING', 'ACCEPTED'].includes(assignmentStatus) ||
      !['DEMANDEE', 'CONFIRMEE', 'REPORTEE', 'REASSIGNEE'].includes(bookingStatus)) return null;
  return assignmentStatus === 'ACCEPTED' && ['CONFIRMEE', 'REPORTEE', 'REASSIGNEE'].includes(bookingStatus)
    ? 'BLOCKED' : 'SOFT_CONFLICT';
}

function validInterval(startUtc: Date, endUtc: Date) {
  if (!(startUtc instanceof Date) || !(endUtc instanceof Date) || !Number.isFinite(startUtc.getTime()) ||
      !Number.isFinite(endUtc.getTime()) || endUtc <= startUtc) throw new BadRequestException('Intervalle invalide');
}

export function overlaps(a: { startUtc: Date; endUtc: Date }, b: { startUtc: Date; endUtc: Date }): boolean {
  validInterval(a.startUtc, a.endUtc);
  validInterval(b.startUtc, b.endUtc);
  return a.startUtc < b.endUtc && a.endUtc > b.startUtc;
}

export function bookingInterval(booking: {
  requestedDate: Date; reportedDate?: Date | null; duration: number;
  project: { building?: { timeZone: string; timeZoneVerified: boolean } | null };
}): SchedulingInterval {
  if (!Number.isInteger(booking.duration) || booking.duration < 1 || booking.duration > 1440) throw new BadRequestException('Durée Booking invalide');
  const startUtc = effectiveBookingDate(booking);
  const endUtc = new Date(startUtc.getTime() + booking.duration * 60_000);
  validInterval(startUtc, endUtc);
  return { startUtc, endUtc, timeZone: booking.project.building?.timeZone ?? 'America/Toronto',
    timeZoneVerified: booking.project.building?.timeZoneVerified === true };
}

@Injectable()
export class SchedulingService {
  constructor(private readonly prisma: PrismaService) {}

  // Lock the target Booking first so its assignment set cannot change while a
  // status transition collects users. Then lock User rows in stable UUID order.
  async lockBooking(tx: Prisma.TransactionClient, organizationId: string, bookingId: string) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "Booking" WHERE "id" = ${bookingId} AND "organizationId" = ${organizationId} FOR UPDATE
    `);
    if (!rows.length) throw new NotFoundException('Réservation introuvable');
  }

  // READ COMMITTED rechecks see commitments made while waiting for these locks.
  async lockUsers(tx: Prisma.TransactionClient, organizationId: string, userIds: string[]) {
    for (const userId of [...new Set(userIds)].sort()) {
      const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "User" WHERE "id" = ${userId} AND "organizationId" = ${organizationId} FOR UPDATE
      `);
      if (!rows.length) throw new NotFoundException('Conseiller introuvable');
    }
  }

  async analyzeUser(input: {
    organizationId: string; userId: string; startUtc: Date; endUtc: Date;
    excludeBookingId?: string; targetBuildingId?: string;
  }, tx?: Prisma.TransactionClient): Promise<AvailabilityResult> {
    const results = await this.analyzeUsers({ ...input, userIds: [input.userId] }, tx);
    const result = results.get(input.userId);
    if (!result) throw new NotFoundException('Conseiller introuvable');
    return result;
  }

  async analyzeUsers(input: {
    organizationId: string; userIds: string[]; startUtc: Date; endUtc: Date;
    excludeBookingId?: string; targetBuildingId?: string;
  }, tx?: Prisma.TransactionClient): Promise<Map<string, AvailabilityResult>> {
    validInterval(input.startUtc, input.endUtc);
    if (!input.userIds.length) return new Map();
    const db = tx ?? this.prisma;
    const earliestStart = new Date(input.startUtc.getTime() - 24 * 60 * 60_000);
    const lowerDate = new Date(input.startUtc.getTime() - 2 * 86400000);
    const upperDate = new Date(input.endUtc.getTime() + 2 * 86400000);
    const [users, building, assignments, activities, schedules, unavailabilities] = await Promise.all([
      db.user.findMany({ where: { organizationId: input.organizationId, isActive: true, id: { in: input.userIds } },
        select: { id: true, email: true } }),
      input.targetBuildingId ? db.building.findFirst({ where: { id: input.targetBuildingId, organizationId: input.organizationId },
        select: { timeZone: true, timeZoneVerified: true } }) : Promise.resolve(null),
      db.bookingAssignment.findMany({ where: {
        userId: { in: input.userIds }, status: { in: ['PENDING', 'ACCEPTED'] },
        booking: { organizationId: input.organizationId, status: { in: ['DEMANDEE', 'CONFIRMEE', 'REPORTEE', 'REASSIGNEE'] },
          ...(input.excludeBookingId ? { id: { not: input.excludeBookingId } } : {}),
          OR: [{ requestedDate: { gte: earliestStart, lt: input.endUtc } },
            { reportedDate: { gte: earliestStart, lt: input.endUtc } }],
        },
      }, include: { booking: { include: { project: { include: { building: true } } } } } }),
      db.projectActivity.findMany({ where: {
        organizationId: input.organizationId, assigneeEmail: { not: null },
        status: { notIn: ['annule', 'fait', 'termine'] },
        scheduledDate: { gte: earliestStart, lt: input.endUtc },
        bookings: { none: {} },
      }, select: { id: true, label: true, customLabel: true, assigneeEmail: true, scheduledDate: true,
        duration: true, customDuration: true, project: { select: { building: { select: { timeZone: true, timeZoneVerified: true } } } } } }),
      db.userWorkSchedule.findMany({ where: { organizationId: input.organizationId, userId: { in: input.userIds },
        effectiveFrom: { lt: upperDate }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: lowerDate } }] },
        include: { intervals: true } }),
      db.userUnavailability.findMany({ where: { organizationId: input.organizationId, userId: { in: input.userIds },
        cancelledAt: null, startAt: { lt: input.endUtc }, endAt: { gt: input.startUtc } },
        select: { id: true, userId: true, startAt: true, endAt: true, timeZone: true } }),
    ]);
    if (input.targetBuildingId && !building) throw new NotFoundException('Bâtiment introuvable');
    const results = new Map<string, AvailabilityResult>();
    const emailToId = new Map<string, string>();
    for (const user of users) {
      results.set(user.id, { status: 'AVAILABLE', conflicts: [], warnings: [], sourcesChecked: ['BOOKING', 'LEGACY_ACTIVITY'] });
      emailToId.set(user.email.trim().toLowerCase(), user.id);
      if (building && !building.timeZoneVerified) results.get(user.id)!.warnings.push('Fuseau horaire du bâtiment à confirmer');
    }
    const target = { startUtc: input.startUtc, endUtc: input.endUtc };
    for (const assignment of assignments) {
      const result = results.get(assignment.userId);
      if (!result) continue;
      const booking = assignment.booking;
      const severity = bookingAssignmentSeverity(assignment.status, booking.status);
      if (!severity) continue;
      let interval: SchedulingInterval;
      try { interval = bookingInterval(booking); }
      catch { result.warnings.push(`Booking ${booking.id} : intervalle invalide`); continue; }
      if (!overlaps(target, interval)) continue;
      result.conflicts.push({ severity, source: 'BOOKING', sourceId: assignment.id,
        bookingId: booking.id, startUtc: interval.startUtc, endUtc: interval.endUtc, timeZone: interval.timeZone,
        label: booking.project.name || 'Réservation', reason: severity === 'BLOCKED' ? 'Affectation acceptée sur une réservation confirmée' : 'Proposition ou réservation provisoire' });
      if (!interval.timeZoneVerified) result.warnings.push(`Fuseau horaire du Booking ${booking.id} à confirmer`);
    }
    for (const activity of activities) {
      const userId = activity.assigneeEmail && emailToId.get(activity.assigneeEmail.trim().toLowerCase());
      const result = userId && results.get(userId);
      if (!result || !activity.scheduledDate) continue;
      const startUtc = activity.scheduledDate;
      const hours = parseActivityDurationHours(activity.customDuration || activity.duration);
      const timeZone = activity.project.building?.timeZone ?? 'America/Toronto';
      const localClock = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(startUtc);
      const localMidnight = localClock.find(part => part.type === 'hour')?.value === '00' &&
        localClock.find(part => part.type === 'minute')?.value === '00';
      if ((startUtc.getUTCHours() === 0 && startUtc.getUTCMinutes() === 0) || localMidnight || !hours || hours <= 0 || hours > 24) {
        result.warnings.push(`Activité legacy ${activity.id} : heure ou durée imprécise`);
        continue;
      }
      const endUtc = new Date(startUtc.getTime() + hours * 60 * 60_000);
      if (!overlaps(target, { startUtc, endUtc })) continue;
      result.conflicts.push({ severity: 'SOFT_CONFLICT', source: 'LEGACY_ACTIVITY', sourceId: activity.id,
        activityId: activity.id, startUtc, endUtc, timeZone,
        label: activity.customLabel || activity.label, reason: 'Conflit potentiel — activité legacy' });
    }
    for (const absence of unavailabilities) {
      const result = results.get(absence.userId);
      if (!result) continue;
      result.sourcesChecked.push('USER_UNAVAILABILITY');
      result.conflicts.push({ severity: 'BLOCKED', source: 'USER_UNAVAILABILITY', sourceId: absence.id,
        startUtc: absence.startAt, endUtc: absence.endAt, timeZone: absence.timeZone,
        label: 'Indisponible', reason: 'Indisponible' });
    }
    for (const [userId, result] of results) {
      if (!result.sourcesChecked.includes('USER_UNAVAILABILITY')) result.sourcesChecked.push('USER_UNAVAILABILITY');
      const versions = schedules.filter(schedule => schedule.userId === userId && schedule.verifiedAt);
      if (!versions.length) { result.warnings.push('Horaire non configuré'); continue; }
      try {
        const validity: Array<{ startUtc: Date; endUtc: Date; scheduleId: string; timeZone: string }> = [];
        const work: Array<{ startUtc: Date; endUtc: Date }> = [];
        for (const version of versions) {
          const ranges = scheduleRanges(version.intervals, version.timeZone, input.startUtc, input.endUtc,
            version.effectiveFrom, version.effectiveUntil);
          if (ranges.validity.endUtc > ranges.validity.startUtc) {
            validity.push({ ...ranges.validity, scheduleId: version.id, timeZone: version.timeZone });
            work.push(...ranges.work);
          }
        }
        if (validity.length) result.sourcesChecked.push('WORK_SCHEDULE');
        if (uncovered(target, validity).length) result.warnings.push('Horaire non configuré pour tout le créneau');
        for (const known of validity) {
          const inside = work.filter(range => overlaps(known, range));
          for (const gap of uncovered(known, inside)) {
            result.conflicts.push({ severity: 'BLOCKED', source: 'WORK_SCHEDULE', sourceId: known.scheduleId,
              startUtc: gap.startUtc, endUtc: gap.endUtc, timeZone: known.timeZone,
              label: 'Hors horaire de travail', reason: 'Le créneau dépasse l’horaire de travail' });
          }
        }
      } catch {
        result.warnings.push('Horaire local impossible à interpréter au changement d’heure');
      }
    }
    for (const result of results.values()) {
      // A demonstrated firm conflict remains BLOCKED. Any unresolved timezone or
      // date precision prevents AVAILABLE, even when the known sources are clear.
      result.status = result.conflicts.some(c => c.severity === 'BLOCKED') ? 'BLOCKED'
        : result.warnings.length ? 'UNKNOWN' : result.conflicts.length ? 'SOFT_CONFLICT' : 'AVAILABLE';
    }
    return results;
  }
}
