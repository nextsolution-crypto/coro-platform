import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserUnavailabilityType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { assertIanaTimeZone } from '../bookings/booking-time';
import { assertNonOverlappingScheduleVersions, civilString, localMidnight, normalizeSlots, parseCivilDate, WorkSlot } from './work-schedule-time';

export type ScheduleActor = { userId: string; organizationId: string; role: string };
export type ScheduleInput = { effectiveFrom: string; intervals: WorkSlot[] };
export type UnavailabilityInput = {
  startAt?: string; endAt?: string; allDay?: boolean; localStartDate?: string; localEndDate?: string;
  timeZone?: string; type: UserUnavailabilityType; privateNote?: string | null;
};

const TYPES = new Set(Object.values(UserUnavailabilityType));
const manager = (actor: ScheduleActor) => actor.role === 'ADMIN' || actor.role === 'SUPER_ADMIN';

@Injectable()
export class WorkSchedulesService {
  constructor(private readonly prisma: PrismaService, private readonly scheduling: SchedulingService) {}

  private assertManager(actor: ScheduleActor) {
    if (!manager(actor)) throw new ForbiddenException('Gestion réservée aux administrateurs');
  }

  private async scopedUser(userId: string, actor: ScheduleActor) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, organizationId: actor.organizationId },
      select: { id: true, timeZone: true, timeZoneVerified: true } });
    if (!user) throw new NotFoundException('Conseiller introuvable');
    return user;
  }

  async current(userId: string, actor: ScheduleActor) {
    if (userId !== actor.userId) this.assertManager(actor);
    const user = await this.scopedUser(userId, actor);
    const today = new Date();
    const schedule = await this.prisma.userWorkSchedule.findFirst({ where: { organizationId: actor.organizationId, userId,
      effectiveFrom: { lte: today }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: today } }] },
      include: { intervals: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] } } });
    return { timeZone: user.timeZone, timeZoneVerified: user.timeZoneVerified, schedule };
  }

  async history(userId: string, actor: ScheduleActor) {
    this.assertManager(actor);
    await this.scopedUser(userId, actor);
    return this.prisma.userWorkSchedule.findMany({ where: { organizationId: actor.organizationId, userId },
      orderBy: { effectiveFrom: 'desc' }, include: { intervals: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] } } });
  }

  async replace(userId: string, input: ScheduleInput, actor: ScheduleActor) {
    this.assertManager(actor);
    const fromDate = civilString(parseCivilDate(input?.effectiveFrom));
    const slots = normalizeSlots(input?.intervals);
    return this.prisma.$transaction(async tx => {
      await this.scheduling.lockUsers(tx, actor.organizationId, [userId]);
      const user = await tx.user.findFirst({ where: { id: userId, organizationId: actor.organizationId },
        select: { organizationId: true, timeZone: true, timeZoneVerified: true } });
      if (!user) throw new NotFoundException('Conseiller introuvable');
      if (!user.timeZoneVerified) throw new BadRequestException('Fuseau personnel à vérifier avant l’horaire');
      assertIanaTimeZone(user.timeZone);
      const from = localMidnight(fromDate, user.timeZone);
      // Read the complete history only after locking User. All schedule writers use this lock.
      const versions = await tx.userWorkSchedule.findMany({ where: { userId }, orderBy: { effectiveFrom: 'asc' } });
      if (versions.some(version => version.organizationId !== user.organizationId)) {
        throw new BadRequestException('Organisation de l’horaire incohérente');
      }
      const openVersions = versions.filter(version => version.effectiveUntil === null);
      if (openVersions.length > 1) throw new BadRequestException('Plusieurs versions ouvertes existent');
      const open = openVersions[0];
      if (open) {
        if (from <= open.effectiveFrom) throw new BadRequestException('La nouvelle version doit commencer après la précédente');
      }
      const resulting = versions.map(version => ({ effectiveFrom: version.effectiveFrom,
        effectiveUntil: version.id === open?.id ? from : version.effectiveUntil }));
      assertNonOverlappingScheduleVersions([...resulting, { effectiveFrom: from, effectiveUntil: null }]);
      if (open) {
        await tx.userWorkSchedule.update({ where: { id: open.id }, data: { effectiveUntil: from } });
      }
      return tx.userWorkSchedule.create({ data: { organizationId: user.organizationId, userId, timeZone: user.timeZone,
        effectiveFrom: from, verifiedAt: new Date(), verifiedByUserId: actor.userId,
        intervals: { create: slots } }, include: { intervals: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async listUnavailability(userId: string, actor: ScheduleActor) {
    if (userId !== actor.userId) this.assertManager(actor);
    await this.scopedUser(userId, actor);
    return this.prisma.userUnavailability.findMany({ where: { organizationId: actor.organizationId, userId },
      orderBy: { startAt: 'desc' } });
  }

  async createUnavailability(userId: string, input: UnavailabilityInput, actor: ScheduleActor) {
    if (userId !== actor.userId) this.assertManager(actor);
    const user = await this.scopedUser(userId, actor);
    if (!input || !TYPES.has(input.type)) throw new BadRequestException('Type d’indisponibilité invalide');
    if (input.privateNote != null && (typeof input.privateNote !== 'string' || input.privateNote.length > 2000)) throw new BadRequestException('Note invalide');
    const timeZone = input.timeZone ?? user.timeZone;
    assertIanaTimeZone(timeZone);
    let startAt: Date;
    let endAt: Date;
    let localStartDate: Date | null = null;
    let localEndDate: Date | null = null;
    if (input.allDay === true) {
      if (!user.timeZoneVerified && !input.timeZone) throw new BadRequestException('Fuseau explicite requis pour une journée entière');
      localStartDate = parseCivilDate(input.localStartDate!);
      localEndDate = parseCivilDate(input.localEndDate!);
      startAt = localMidnight(civilString(localStartDate), timeZone);
      endAt = localMidnight(civilString(localEndDate), timeZone);
    } else {
      const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/i;
      if (!iso.test(input.startAt ?? '') || !iso.test(input.endAt ?? '')) throw new BadRequestException('Dates ISO avec offset requises');
      startAt = new Date(input.startAt!);
      endAt = new Date(input.endAt!);
    }
    if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || endAt <= startAt) throw new BadRequestException('Intervalle invalide');
    return this.prisma.$transaction(async tx => {
      await this.scheduling.lockUsers(tx, actor.organizationId, [userId]);
      return tx.userUnavailability.create({ data: { organizationId: actor.organizationId, userId,
        startAt, endAt, allDay: input.allDay === true, localStartDate, localEndDate, timeZone,
        type: input.type, privateNote: input.privateNote ?? null, createdByUserId: actor.userId } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async cancelUnavailability(id: string, actor: ScheduleActor) {
    return this.prisma.$transaction(async tx => {
      const existing = await tx.userUnavailability.findFirst({ where: { id, organizationId: actor.organizationId } });
      if (!existing) throw new NotFoundException('Indisponibilité introuvable');
      if (existing.userId !== actor.userId) this.assertManager(actor);
      await this.scheduling.lockUsers(tx, actor.organizationId, [existing.userId]);
      const result = await tx.userUnavailability.updateMany({ where: { id, organizationId: actor.organizationId, cancelledAt: null },
        data: { cancelledAt: new Date(), cancelledByUserId: actor.userId } });
      if (result.count !== 1) throw new BadRequestException('Indisponibilité déjà annulée');
      return tx.userUnavailability.findUniqueOrThrow({ where: { id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }
}
