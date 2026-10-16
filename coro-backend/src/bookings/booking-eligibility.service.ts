import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectAdvisorEligibility } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type EligibilityActor = {
  userId: string;
  organizationId: string;
  role: string;
};

@Injectable()
export class BookingEligibilityService {
  constructor(private readonly prisma: PrismaService) {}

  private assertManager(actor: EligibilityActor): void {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(actor.role)) {
      throw new ForbiddenException('Gestion de l’admissibilité non autorisée');
    }
  }

  async grant(
    projectId: string,
    input: { advisorUserId: string; activityId?: string; priority: number },
    actor: EligibilityActor,
  ): Promise<ProjectAdvisorEligibility> {
    this.assertManager(actor);
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.findFirst({
        where: { id: projectId, organizationId: actor.organizationId },
        select: { id: true },
      });
      if (!project) throw new NotFoundException('Projet introuvable');
      const advisor = await tx.user.findFirst({
        where: {
          id: input.advisorUserId,
          organizationId: actor.organizationId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!advisor) throw new BadRequestException('Conseiller invalide');
      if (input.activityId) {
        const activity = await tx.projectActivity.findFirst({
          where: {
            id: input.activityId,
            projectId,
            organizationId: actor.organizationId,
          },
          select: { id: true },
        });
        if (!activity) throw new BadRequestException('Activité invalide');
      }
      const existing = await tx.projectAdvisorEligibility.findFirst({
        where: {
          projectId,
          activityId: input.activityId ?? null,
          advisorUserId: input.advisorUserId,
        },
      });
      const eligibility = existing
        ? await tx.projectAdvisorEligibility.update({
            where: { id: existing.id },
            data: {
              status: 'ACTIVE',
              priority: input.priority,
              authorizedByUserId: actor.userId,
              authorizedAt: new Date(),
              revokedAt: null,
            },
          })
        : await tx.projectAdvisorEligibility.create({
            data: {
              organizationId: actor.organizationId,
              projectId,
              activityId: input.activityId,
              advisorUserId: input.advisorUserId,
              priority: input.priority,
              authorizedByUserId: actor.userId,
            },
          });
      await tx.auditLog.create({
        data: {
          userId: actor.userId,
          organizationId: actor.organizationId,
          projectId,
          action: 'BOOKING_ADVISOR_ELIGIBILITY_GRANTED',
          entityType: 'ProjectAdvisorEligibility',
          entityId: eligibility.id,
          description: 'Admissibilité de conseiller accordée.',
          metadata: {
            advisorUserId: input.advisorUserId,
            activityId: input.activityId ?? null,
            priority: input.priority,
          },
        },
      });
      return eligibility;
    });
  }

  async revoke(
    id: string,
    actor: EligibilityActor,
  ): Promise<ProjectAdvisorEligibility> {
    this.assertManager(actor);
    return this.prisma.$transaction(async (tx) => {
      const eligibility = await tx.projectAdvisorEligibility.findFirst({
        where: { id, organizationId: actor.organizationId },
      });
      if (!eligibility)
        throw new NotFoundException('Admissibilité introuvable');
      const pending = await tx.bookingAssignment.count({
        where: {
          userId: eligibility.advisorUserId,
          status: 'PENDING',
          booking: {
            projectId: eligibility.projectId,
            ...(eligibility.activityId
              ? { activityId: eligibility.activityId }
              : {}),
          },
        },
      });
      if (pending > 0) {
        throw new ConflictException(
          'Réaffectez les engagements en attente avant de révoquer l’admissibilité',
        );
      }
      const revoked = await tx.projectAdvisorEligibility.update({
        where: { id },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.userId,
          organizationId: actor.organizationId,
          projectId: eligibility.projectId,
          action: 'BOOKING_ADVISOR_ELIGIBILITY_REVOKED',
          entityType: 'ProjectAdvisorEligibility',
          entityId: id,
          description: 'Admissibilité de conseiller révoquée.',
          metadata: {
            advisorUserId: eligibility.advisorUserId,
            activityId: eligibility.activityId,
          },
        },
      });
      return revoked;
    });
  }

  async resolveEligible(
    tx: Prisma.TransactionClient,
    input: { organizationId: string; projectId: string; activityId?: string },
  ): Promise<ProjectAdvisorEligibility[]> {
    return tx.projectAdvisorEligibility.findMany({
      where: {
        organizationId: input.organizationId,
        projectId: input.projectId,
        status: 'ACTIVE',
        OR: input.activityId
          ? [{ activityId: input.activityId }, { activityId: null }]
          : [{ activityId: null }],
        advisor: { organizationId: input.organizationId, isActive: true },
      },
      orderBy: [{ priority: 'asc' }, { advisorUserId: 'asc' }],
    });
  }
}
