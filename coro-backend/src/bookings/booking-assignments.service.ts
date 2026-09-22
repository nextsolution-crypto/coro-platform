import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingAssignmentRole, BookingAssignmentStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface BookingActor {
  userId: string;
  organizationId: string;
  role: UserRole;
}

const ACTIVE: BookingAssignmentStatus[] = ['PENDING', 'ACCEPTED'];
type AssignmentNotification = 'NEW' | 'ACCEPTED' | 'DECLINED' | 'REPLACED' | 'REMOVED';

@Injectable()
export class BookingAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private requireManager(actor: BookingActor) {
    if (actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Gestion des affectations réservée aux administrateurs');
    }
  }

  private async bookingInScope(tx: Prisma.TransactionClient, bookingId: string, actor: BookingActor) {
    const booking = await tx.booking.findFirst({ where: { id: bookingId, organizationId: actor.organizationId } });
    if (!booking) throw new NotFoundException('Réservation introuvable');
    return booking;
  }

  private async eligibleUser(tx: Prisma.TransactionClient, userId: string, organizationId: string) {
    const user = await tx.user.findFirst({ where: { id: userId, organizationId, isActive: true } });
    if (!user) throw new BadRequestException('Conseiller inexistant, inactif ou hors organisation');
    return user;
  }

  private async notify(tx: Prisma.TransactionClient, booking: { projectId: string }, actor: BookingActor, userId: string, kind: AssignmentNotification) {
    await tx.notification.create({ data: {
      userId, organizationId: actor.organizationId, projectId: booking.projectId,
      type: `BOOKING_ASSIGNMENT_${kind}`,
      title: 'Affectation Booking',
      message: {
        NEW: 'Une affectation vous a été proposée.',
        ACCEPTED: 'Une affectation Booking a été acceptée.',
        DECLINED: 'Une affectation Booking a été refusée.',
        REPLACED: 'Votre affectation Booking a été remplacée.',
        REMOVED: 'Votre affectation Booking a été retirée.',
      }[kind],
    } });
  }

  async list(bookingId: string, actor: BookingActor, includeHistory = false) {
    await this.bookingInScope(this.prisma, bookingId, actor);
    return this.prisma.bookingAssignment.findMany({
      where: { bookingId, ...(!includeHistory ? { status: { in: ACTIVE } } : {}) },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ assignedAt: 'asc' }, { id: 'asc' }],
    });
  }

  async add(bookingId: string, userId: string, role: BookingAssignmentRole, actor: BookingActor) {
    this.requireManager(actor);
    return this.prisma.$transaction(async tx => {
      const booking = await this.bookingInScope(tx, bookingId, actor);
      await this.eligibleUser(tx, userId, actor.organizationId);
      if (role === 'LEAD' && await tx.bookingAssignment.findFirst({ where: { bookingId, role: 'LEAD', status: { in: ACTIVE } } })) {
        throw new BadRequestException('Un LEAD actif existe déjà');
      }
      if (await tx.bookingAssignment.findFirst({ where: { bookingId, userId, role, status: { in: ACTIVE } } })) {
        throw new BadRequestException('Affectation active identique déjà présente');
      }
      const assignment = await tx.bookingAssignment.create({
        data: { bookingId, userId, role, status: 'PENDING', assignedByUserId: actor.userId },
      });
      if (role === 'LEAD') await tx.booking.update({ where: { id: bookingId }, data: { assignedUserId: userId } });
      await this.notify(tx, booking, actor, userId, 'NEW');
      return assignment;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async respond(bookingId: string, assignmentId: string, status: BookingAssignmentStatus, declineReason: string | undefined, actor: BookingActor) {
    if (status !== 'ACCEPTED' && status !== 'DECLINED') throw new BadRequestException('Réponse invalide');
    return this.prisma.$transaction(async tx => {
      const booking = await this.bookingInScope(tx, bookingId, actor);
      const assignment = await tx.bookingAssignment.findFirst({ where: { id: assignmentId, bookingId } });
      if (!assignment) throw new NotFoundException('Affectation introuvable');
      if (assignment.userId !== actor.userId) throw new ForbiddenException('Vous ne pouvez répondre que pour vous-même');
      if (assignment.status !== 'PENDING') throw new BadRequestException('Affectation déjà traitée');
      const now = new Date();
      const result = await tx.bookingAssignment.updateMany({
        where: { id: assignmentId, bookingId, status: 'PENDING' },
        data: { status, respondedAt: now, declineReason: status === 'DECLINED' ? declineReason?.trim() || null : null,
          endedAt: status === 'DECLINED' ? now : null },
      });
      if (result.count !== 1) throw new BadRequestException('Affectation déjà traitée');
      if (assignment.assignedByUserId) await this.notify(tx, booking, actor, assignment.assignedByUserId, status);
      return tx.bookingAssignment.findUniqueOrThrow({ where: { id: assignmentId } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async replace(bookingId: string, assignmentId: string, newUserId: string, actor: BookingActor) {
    this.requireManager(actor);
    return this.prisma.$transaction(async tx => {
      const booking = await this.bookingInScope(tx, bookingId, actor);
      const old = await tx.bookingAssignment.findFirst({ where: { id: assignmentId, bookingId, status: { in: ACTIVE } } });
      if (!old) throw new NotFoundException('Affectation active introuvable');
      if (old.userId === newUserId) throw new BadRequestException('Le remplaçant doit être différent');
      await this.eligibleUser(tx, newUserId, actor.organizationId);
      if (await tx.bookingAssignment.findFirst({ where: { bookingId, userId: newUserId, role: old.role, status: { in: ACTIVE } } })) {
        throw new BadRequestException('Affectation active identique déjà présente');
      }
      const now = new Date();
      await tx.bookingAssignment.update({ where: { id: old.id }, data: { status: 'REPLACED', endedAt: now } });
      const replacement = await tx.bookingAssignment.create({
        data: { bookingId, userId: newUserId, role: old.role, status: 'PENDING', assignedByUserId: actor.userId, assignedAt: now },
      });
      await tx.bookingAssignment.update({ where: { id: old.id }, data: { replacedByAssignmentId: replacement.id } });
      if (old.role === 'LEAD') await tx.booking.update({ where: { id: bookingId }, data: { assignedUserId: newUserId } });
      await this.notify(tx, booking, actor, old.userId, 'REPLACED');
      await this.notify(tx, booking, actor, newUserId, 'NEW');
      return replacement;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async remove(bookingId: string, assignmentId: string, actor: BookingActor) {
    this.requireManager(actor);
    return this.prisma.$transaction(async tx => {
      const booking = await this.bookingInScope(tx, bookingId, actor);
      const assignment = await tx.bookingAssignment.findFirst({ where: { id: assignmentId, bookingId, status: { in: ACTIVE } } });
      if (!assignment) throw new NotFoundException('Affectation active introuvable');
      if (assignment.role !== 'SUPPORT') throw new BadRequestException('Remplacez le LEAD au lieu de le retirer');
      const removed = await tx.bookingAssignment.update({ where: { id: assignmentId }, data: { status: 'REMOVED', endedAt: new Date() } });
      await this.notify(tx, booking, actor, assignment.userId, 'REMOVED');
      return removed;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
