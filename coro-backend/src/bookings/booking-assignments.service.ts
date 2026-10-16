import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingAssignmentRole,
  BookingAssignmentStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  SchedulingService,
  bookingInterval,
} from '../scheduling/scheduling.service';
import { CapacityService } from '../mandate/capacity.service';
import {
  createAssignmentNotification,
  type AssignmentNotificationKind,
} from './booking-assignment-notifications';
import {
  assertExpectedCommitment,
  createCommitmentVersion,
} from './booking-commitment';

export interface BookingActor {
  userId: string;
  organizationId: string;
  role: UserRole;
}

const ACTIVE: BookingAssignmentStatus[] = ['PENDING', 'ACCEPTED'];

@Injectable()
export class BookingAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduling: SchedulingService,
    private readonly capacity: CapacityService,
  ) {}

  private async availability(
    bookingId: string,
    userId: string,
    actor: BookingActor,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    const booking = await db.booking.findFirst({
      where: { id: bookingId, organizationId: actor.organizationId },
      include: { project: { include: { building: true } } },
    });
    if (!booking) throw new NotFoundException('Réservation introuvable');
    const interval = bookingInterval(booking);
    return this.scheduling.analyzeUser(
      {
        organizationId: actor.organizationId,
        userId,
        startUtc: interval.startUtc,
        endUtc: interval.endUtc,
        excludeBookingId: bookingId,
        targetBuildingId: booking.project.buildingId,
      },
      tx,
    );
  }

  private requireNoUnapprovedBlock(
    result: Awaited<ReturnType<SchedulingService['analyzeUser']>>,
    allowConflict?: boolean,
  ) {
    if (result.status === 'BLOCKED' && !allowConflict)
      throw new BadRequestException({
        message: 'Conflit confirmé : override administratif requis',
        availabilityStatus: result.status,
        conflicts: result.conflicts,
        warnings: result.warnings,
      });
  }

  private async recordOverride(
    tx: Prisma.TransactionClient,
    actor: BookingActor,
    bookingId: string,
    userId: string,
  ) {
    await tx.notification.create({
      data: {
        userId: actor.userId,
        organizationId: actor.organizationId,
        type: 'BOOKING_SCHEDULING_OVERRIDE',
        title: 'Conflit Booking contourné',
        message: `Booking ${bookingId} : conflit confirmé contourné pour le conseiller ${userId} par ${actor.userId}`,
      },
    });
  }

  async availableUsers(bookingId: string, actor: BookingActor) {
    this.requireManager(actor);
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, organizationId: actor.organizationId },
      include: { project: { include: { building: true } } },
    });
    if (!booking) throw new NotFoundException('Réservation introuvable');
    const interval = bookingInterval(booking);
    const users = await this.prisma.user.findMany({
      where: {
        organizationId: actor.organizationId,
        isActive: true,
        role: { in: ['ADMIN', 'SUPER_ADMIN', 'OPERATOR'] },
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const [availability, capacity] = await Promise.all([
      this.scheduling.analyzeUsers({
        organizationId: actor.organizationId,
        userIds: users.map((user) => user.id),
        startUtc: interval.startUtc,
        endUtc: interval.endUtc,
        excludeBookingId: bookingId,
        targetBuildingId: booking.project.buildingId,
      }),
      this.capacity.getCapacityPlanning(actor.organizationId),
    ]);
    const capacityByUser = new Map(capacity.map((row) => [row.userId, row]));
    return users.map((user) => {
      const result = availability.get(user.id)!;
      const workload = capacityByUser.get(user.id);
      return {
        ...user,
        availabilityStatus: result.status,
        conflicts: result.conflicts,
        warnings: result.warnings,
        sourcesChecked: result.sourcesChecked,
        confirmedWorkload: workload?.chargeConfirmee ?? 0,
        pendingWorkload: workload?.chargeProvisoire ?? 0,
        utilizationConfirmed: workload?.tauxUtilisationConfirmee ?? null,
      };
    });
  }

  private requireManager(actor: BookingActor) {
    if (actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Gestion des affectations réservée aux administrateurs',
      );
    }
  }

  private async bookingInScope(
    tx: Prisma.TransactionClient,
    bookingId: string,
    actor: BookingActor,
  ) {
    const booking = await tx.booking.findFirst({
      where: { id: bookingId, organizationId: actor.organizationId },
    });
    if (!booking) throw new NotFoundException('Réservation introuvable');
    return booking;
  }

  private async eligibleUser(
    tx: Prisma.TransactionClient,
    userId: string,
    organizationId: string,
  ) {
    const user = await tx.user.findFirst({
      where: { id: userId, organizationId, isActive: true },
    });
    if (!user)
      throw new BadRequestException(
        'Conseiller inexistant, inactif ou hors organisation',
      );
    return user;
  }

  private async assertExplicitEligibility(
    tx: Prisma.TransactionClient,
    booking: { projectId: string; activityId: string | null },
    userId: string,
    organizationId: string,
  ) {
    const eligibility = await tx.projectAdvisorEligibility.findFirst({
      where: {
        organizationId,
        projectId: booking.projectId,
        advisorUserId: userId,
        status: 'ACTIVE',
        OR: booking.activityId
          ? [{ activityId: booking.activityId }, { activityId: null }]
          : [{ activityId: null }],
      },
      select: { id: true },
    });
    if (!eligibility) {
      throw new BadRequestException(
        'Le conseiller n’est pas explicitement admissible pour cette activité',
      );
    }
  }

  private async notify(
    tx: Prisma.TransactionClient,
    booking: { projectId: string },
    actor: BookingActor,
    userId: string,
    kind: AssignmentNotificationKind,
  ) {
    await createAssignmentNotification(tx, {
      kind,
      userId,
      organizationId: actor.organizationId,
      projectId: booking.projectId,
    });
  }

  async list(bookingId: string, actor: BookingActor, includeHistory = false) {
    await this.bookingInScope(this.prisma, bookingId, actor);
    return this.prisma.bookingAssignment.findMany({
      where: {
        bookingId,
        ...(!includeHistory ? { status: { in: ACTIVE } } : {}),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ assignedAt: 'asc' }, { id: 'asc' }],
    });
  }

  async add(
    bookingId: string,
    userId: string,
    role: BookingAssignmentRole,
    actor: BookingActor,
    allowConflict = false,
  ) {
    this.requireManager(actor);
    let availability = await this.availability(bookingId, userId, actor);
    this.requireNoUnapprovedBlock(availability, allowConflict);
    const assignment = await this.prisma.$transaction(
      async (tx) => {
        await this.scheduling.lockBooking(tx, actor.organizationId, bookingId);
        await this.scheduling.lockUsers(tx, actor.organizationId, [userId]);
        availability = await this.availability(bookingId, userId, actor, tx);
        this.requireNoUnapprovedBlock(availability, allowConflict);
        const booking = await this.bookingInScope(tx, bookingId, actor);
        await this.eligibleUser(tx, userId, actor.organizationId);
        await this.assertExplicitEligibility(
          tx,
          booking,
          userId,
          actor.organizationId,
        );
        if (
          role === 'LEAD' &&
          (await tx.bookingAssignment.findFirst({
            where: { bookingId, role: 'LEAD', status: { in: ACTIVE } },
          }))
        ) {
          throw new BadRequestException('Un LEAD actif existe déjà');
        }
        if (
          await tx.bookingAssignment.findFirst({
            where: { bookingId, userId, role, status: { in: ACTIVE } },
          })
        ) {
          throw new BadRequestException(
            'Affectation active identique déjà présente',
          );
        }
        const assignment = await tx.bookingAssignment.create({
          data: {
            bookingId,
            userId,
            role,
            status: 'PENDING',
            assignedByUserId: actor.userId,
            commitmentVersionId: booking.pendingCommitmentVersionId,
          },
        });
        if (role === 'LEAD')
          await tx.booking.update({
            where: { id: bookingId },
            data: { assignedUserId: userId },
          });
        await this.notify(tx, booking, actor, userId, 'NEW');
        if (availability.status === 'BLOCKED' && allowConflict)
          await this.recordOverride(tx, actor, bookingId, userId);
        return assignment;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
    return Object.assign(assignment, { availability });
  }

  async respond(
    bookingId: string,
    assignmentId: string,
    status: BookingAssignmentStatus,
    declineReason: string | undefined,
    actor: BookingActor,
    commitmentVersionId?: string,
    expectedFingerprint?: string,
  ) {
    if (status !== 'ACCEPTED' && status !== 'DECLINED')
      throw new BadRequestException('Réponse invalide');
    let availability:
      | Awaited<ReturnType<SchedulingService['analyzeUser']>>
      | undefined;
    const result = await this.prisma.$transaction(
      async (tx) => {
        await this.scheduling.lockBooking(tx, actor.organizationId, bookingId);
        const booking = await this.bookingInScope(tx, bookingId, actor);
        const assignment = await tx.bookingAssignment.findFirst({
          where: { id: assignmentId, bookingId },
          include: { commitmentVersion: true },
        });
        if (!assignment) throw new NotFoundException('Affectation introuvable');
        if (assignment.userId !== actor.userId)
          throw new ForbiddenException(
            'Vous ne pouvez répondre que pour vous-même',
          );
        if (assignment.status === status) return assignment;
        if (
          assignment.status === 'ACCEPTED' ||
          assignment.status === 'DECLINED'
        ) {
          throw new BadRequestException(
            'Cette affectation a déjà reçu une réponse différente',
          );
        }
        if (assignment.status !== 'PENDING')
          throw new BadRequestException(
            'Cette affectation ne peut plus recevoir de réponse',
          );
        if (
          !['DEMANDEE', 'CONFIRMEE', 'REPORTEE', 'REASSIGNEE'].includes(
            booking.status,
          )
        ) {
          throw new BadRequestException(
            'Cette planification ne permet plus de répondre à l’affectation',
          );
        }
        if (assignment.commitmentVersion) {
          assertExpectedCommitment(
            assignment.commitmentVersion,
            commitmentVersionId,
            expectedFingerprint,
          );
          if (
            booking.pendingCommitmentVersionId !==
            assignment.commitmentVersion.id
          ) {
            throw new BadRequestException(
              'Cette proposition d’engagement n’est plus courante',
            );
          }
          if (assignment.commitmentVersion.advisorId !== actor.userId) {
            throw new ForbiddenException(
              'Le conseiller ne correspond pas à l’engagement proposé',
            );
          }
        }
        if (status === 'ACCEPTED') {
          await this.scheduling.lockUsers(tx, actor.organizationId, [
            actor.userId,
          ]);
          availability = await this.availability(
            bookingId,
            actor.userId,
            actor,
            tx,
          );
          this.requireNoUnapprovedBlock(availability);
        }
        const now = new Date();
        const result = await tx.bookingAssignment.updateMany({
          where: { id: assignmentId, bookingId, status: 'PENDING' },
          data: {
            status,
            respondedAt: now,
            respondedByUserId: actor.userId,
            responseFingerprint:
              assignment.commitmentVersion?.canonicalFingerprint ?? null,
            declineReason:
              status === 'DECLINED' ? declineReason?.trim() || null : null,
            endedAt: status === 'DECLINED' ? now : null,
          },
        });
        if (result.count !== 1)
          throw new BadRequestException('Affectation déjà traitée');
        if (assignment.commitmentVersion) {
          if (status === 'DECLINED') {
            await tx.bookingCommitmentVersion.update({
              where: { id: assignment.commitmentVersion.id },
              data: { status: 'DECLINED' },
            });
            await tx.booking.update({
              where: { id: bookingId },
              data: {
                pendingCommitmentVersionId: null,
                commitmentLockVersion: { increment: 1 },
              },
            });
          } else if (assignment.commitmentVersion.customerAgreedAt) {
            if (booking.currentCommitmentVersionId) {
              await tx.bookingCommitmentVersion.update({
                where: { id: booking.currentCommitmentVersionId },
                data: { status: 'SUPERSEDED', supersededAt: now },
              });
            }
            await tx.bookingCommitmentVersion.update({
              where: { id: assignment.commitmentVersion.id },
              data: { status: 'CONFIRMED', confirmedAt: now },
            });
            await tx.booking.update({
              where: { id: bookingId },
              data: {
                status: 'CONFIRMEE',
                currentCommitmentVersionId: assignment.commitmentVersion.id,
                pendingCommitmentVersionId: null,
                requestedDate: assignment.commitmentVersion.startAt,
                duration: assignment.commitmentVersion.durationMinutes,
                reportedDate:
                  assignment.commitmentVersion.changeType === 'RESCHEDULE'
                    ? assignment.commitmentVersion.startAt
                    : booking.reportedDate,
                assignedUserId: assignment.commitmentVersion.advisorId,
                commitmentLockVersion: { increment: 1 },
              },
            });
          }
        }
        await tx.auditLog.create({
          data: {
            action:
              status === 'ACCEPTED'
                ? 'ASSIGNMENT_ACCEPTED'
                : 'ASSIGNMENT_REFUSED',
            entityType: 'BookingAssignment',
            entityId: assignment.id,
            projectId: booking.projectId,
            description:
              status === 'ACCEPTED'
                ? 'Affectation acceptée par le conseiller.'
                : 'Affectation refusée par le conseiller.',
            metadata: {
              bookingId,
              activityId: booking.activityId,
              role: assignment.role,
              previousStatus: 'PENDING',
              newStatus: status,
              commitmentVersionId: assignment.commitmentVersion?.id ?? null,
              commitmentFingerprint:
                assignment.commitmentVersion?.canonicalFingerprint ?? null,
            },
            userId: actor.userId,
            organizationId: actor.organizationId,
          },
        });
        if (
          assignment.assignedByUserId &&
          assignment.assignedByUserId !== actor.userId
        ) {
          const assigner = await tx.user.findFirst({
            where: {
              id: assignment.assignedByUserId,
              organizationId: actor.organizationId,
              isActive: true,
            },
            select: { id: true },
          });
          if (assigner)
            await this.notify(tx, booking, actor, assigner.id, status);
        }
        return tx.bookingAssignment.findUniqueOrThrow({
          where: { id: assignmentId },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
    return availability ? Object.assign(result, { availability }) : result;
  }

  async replace(
    bookingId: string,
    assignmentId: string,
    newUserId: string,
    actor: BookingActor,
    allowConflict = false,
  ) {
    this.requireManager(actor);
    const governed = await this.prisma.booking.findFirst({
      where: { id: bookingId, organizationId: actor.organizationId },
      select: {
        currentCommitmentVersionId: true,
        pendingCommitmentVersionId: true,
      },
    });
    if (!governed) throw new NotFoundException('Réservation introuvable');
    if (
      !governed.currentCommitmentVersionId &&
      !governed.pendingCommitmentVersionId
    ) {
      return this.replaceLegacy(
        bookingId,
        assignmentId,
        newUserId,
        actor,
        allowConflict,
      );
    }
    let availability = await this.availability(bookingId, newUserId, actor);
    this.requireNoUnapprovedBlock(availability, allowConflict);
    const replacement = await this.prisma.$transaction(
      async (tx) => {
        await this.scheduling.lockBooking(tx, actor.organizationId, bookingId);
        await this.scheduling.lockUsers(tx, actor.organizationId, [newUserId]);
        const booking = await tx.booking.findFirst({
          where: { id: bookingId, organizationId: actor.organizationId },
          include: {
            project: { include: { building: true } },
            currentCommitmentVersion: true,
            pendingCommitmentVersion: true,
          },
        });
        if (!booking) throw new NotFoundException('Réservation introuvable');
        const old = await tx.bookingAssignment.findFirst({
          where: { id: assignmentId, bookingId, status: { in: ACTIVE } },
          include: { commitmentVersion: true },
        });
        if (!old) throw new NotFoundException('Affectation active introuvable');
        if (old.userId === newUserId)
          throw new BadRequestException('Le remplaçant doit être différent');
        await this.eligibleUser(tx, newUserId, actor.organizationId);
        await this.assertExplicitEligibility(
          tx,
          booking,
          newUserId,
          actor.organizationId,
        );
        availability = await this.availability(bookingId, newUserId, actor, tx);
        this.requireNoUnapprovedBlock(availability, allowConflict);
        const now = new Date();
        if (booking.pendingCommitmentVersion) {
          await tx.bookingCommitmentVersion.update({
            where: { id: booking.pendingCommitmentVersion.id },
            data: { status: 'SUPERSEDED', supersededAt: now },
          });
          await tx.bookingAssignment.updateMany({
            where: {
              bookingId,
              commitmentVersionId: booking.pendingCommitmentVersion.id,
              status: 'PENDING',
            },
            data: { status: 'REPLACED', endedAt: now },
          });
        }
        const source =
          booking.currentCommitmentVersion ?? old.commitmentVersion;
        const commitment = await createCommitmentVersion(tx, {
          bookingId,
          projectId: booking.projectId,
          activityId: booking.activityId,
          buildingId: booking.project.buildingId,
          advisorId: newUserId,
          startAt:
            source?.startAt ?? booking.reportedDate ?? booking.requestedDate,
          durationMinutes: source?.durationMinutes ?? booking.duration,
          changeType: 'REASSIGNMENT',
          proposedByActorType: 'USER',
          proposedByActorId: actor.userId,
        });
        const next = await tx.bookingAssignment.create({
          data: {
            bookingId,
            userId: newUserId,
            role: old.role,
            status: 'PENDING',
            assignedByUserId: actor.userId,
            assignedAt: now,
            commitmentVersionId: commitment.id,
          },
        });
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            pendingCommitmentVersionId: commitment.id,
            commitmentLockVersion: { increment: 1 },
          },
        });
        await this.notify(tx, booking, actor, newUserId, 'NEW');
        return next;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
    return Object.assign(replacement, { availability });
  }

  private async replaceLegacy(
    bookingId: string,
    assignmentId: string,
    newUserId: string,
    actor: BookingActor,
    allowConflict = false,
  ) {
    this.requireManager(actor);
    let availability = await this.availability(bookingId, newUserId, actor);
    this.requireNoUnapprovedBlock(availability, allowConflict);
    const replacement = await this.prisma.$transaction(
      async (tx) => {
        await this.scheduling.lockBooking(tx, actor.organizationId, bookingId);
        await this.scheduling.lockUsers(tx, actor.organizationId, [newUserId]);
        availability = await this.availability(bookingId, newUserId, actor, tx);
        this.requireNoUnapprovedBlock(availability, allowConflict);
        const booking = await this.bookingInScope(tx, bookingId, actor);
        const old = await tx.bookingAssignment.findFirst({
          where: { id: assignmentId, bookingId, status: { in: ACTIVE } },
        });
        if (!old) throw new NotFoundException('Affectation active introuvable');
        if (old.userId === newUserId)
          throw new BadRequestException('Le remplaçant doit être différent');
        await this.eligibleUser(tx, newUserId, actor.organizationId);
        await this.assertExplicitEligibility(
          tx,
          booking,
          newUserId,
          actor.organizationId,
        );
        if (
          await tx.bookingAssignment.findFirst({
            where: {
              bookingId,
              userId: newUserId,
              role: old.role,
              status: { in: ACTIVE },
            },
          })
        ) {
          throw new BadRequestException(
            'Affectation active identique déjà présente',
          );
        }
        const now = new Date();
        await tx.bookingAssignment.update({
          where: { id: old.id },
          data: { status: 'REPLACED', endedAt: now },
        });
        const replacement = await tx.bookingAssignment.create({
          data: {
            bookingId,
            userId: newUserId,
            role: old.role,
            status: 'PENDING',
            assignedByUserId: actor.userId,
            assignedAt: now,
          },
        });
        await tx.bookingAssignment.update({
          where: { id: old.id },
          data: { replacedByAssignmentId: replacement.id },
        });
        if (old.role === 'LEAD')
          await tx.booking.update({
            where: { id: bookingId },
            data: { assignedUserId: newUserId },
          });
        await this.notify(tx, booking, actor, old.userId, 'REPLACED');
        await this.notify(tx, booking, actor, newUserId, 'NEW');
        if (availability.status === 'BLOCKED' && allowConflict)
          await this.recordOverride(tx, actor, bookingId, newUserId);
        return replacement;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
    return Object.assign(replacement, { availability });
  }

  async remove(bookingId: string, assignmentId: string, actor: BookingActor) {
    this.requireManager(actor);
    return this.prisma.$transaction(
      async (tx) => {
        await this.scheduling.lockBooking(tx, actor.organizationId, bookingId);
        const booking = await this.bookingInScope(tx, bookingId, actor);
        const assignment = await tx.bookingAssignment.findFirst({
          where: { id: assignmentId, bookingId, status: { in: ACTIVE } },
        });
        if (!assignment)
          throw new NotFoundException('Affectation active introuvable');
        if (assignment.role !== 'SUPPORT')
          throw new BadRequestException(
            'Remplacez le LEAD au lieu de le retirer',
          );
        const removed = await tx.bookingAssignment.update({
          where: { id: assignmentId },
          data: { status: 'REMOVED', endedAt: new Date() },
        });
        await this.notify(tx, booking, actor, assignment.userId, 'REMOVED');
        return removed;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
