import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  WorkManagementActor,
  requireTenantAdmin,
} from '../auth/work-management-access';
import {
  CostRateTransitionDto,
  CreateAdvisorCostRateDto,
} from './rendement.dto';
import { assertCivilDate, civilDateInToronto } from './rendement-time';

type FinancialActor = WorkManagementActor & {
  firstName?: string;
  lastName?: string;
};

@Injectable()
export class AdvisorCostRatesService {
  constructor(private readonly prisma: PrismaService) {}

  list(actor: FinancialActor, userId?: string) {
    requireTenantAdmin(actor);
    return this.prisma.advisorInternalCostRate.findMany({
      where: {
        organizationId: actor.organizationId,
        ...(userId ? { userId } : {}),
      },
      orderBy: [
        { userId: 'asc' },
        { currency: 'asc' },
        { effectiveFrom: 'asc' },
      ],
    });
  }

  async createDraft(dto: CreateAdvisorCostRateDto, actor: FinancialActor) {
    requireTenantAdmin(actor);
    const advisor = await this.prisma.user.findFirst({
      where: {
        id: dto.userId,
        organizationId: actor.organizationId,
        isActive: true,
      },
      select: { id: true },
    });
    if (!advisor) throw new NotFoundException('Conseiller introuvable.');
    const hourlyCost = new Prisma.Decimal(dto.hourlyCost);
    if (!hourlyCost.isFinite() || hourlyCost.isNegative())
      throw new BadRequestException(
        'Le coût horaire doit être fini et non négatif.',
      );
    const effectiveFrom = this.civil(dto.effectiveFrom, 'effectiveFrom');
    const effectiveUntil = dto.effectiveUntil
      ? this.civil(dto.effectiveUntil, 'effectiveUntil')
      : null;
    if (effectiveUntil && effectiveUntil <= effectiveFrom)
      throw new BadRequestException(
        'effectiveUntil doit être postérieure à effectiveFrom.',
      );

    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.advisorInternalCostRate.create({
          data: {
            organizationId: actor.organizationId,
            userId: advisor.id,
            currency: dto.currency,
            hourlyCost,
            effectiveFrom,
            effectiveUntil,
            supersedesRateId: dto.supersedesRateId || null,
          },
        });
        await this.audit(
          tx,
          actor,
          'ADVISOR_COST_RATE_DRAFT_CREATED',
          created.id,
          null,
          created,
        );
        return created;
      });
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  submit(id: string, dto: CostRateTransitionDto, actor: FinancialActor) {
    return this.transition(id, 'DRAFT', 'PROPOSED', dto, actor);
  }

  reject(id: string, dto: CostRateTransitionDto, actor: FinancialActor) {
    return this.transition(id, 'PROPOSED', 'REJECTED', dto, actor);
  }

  async approve(id: string, dto: CostRateTransitionDto, actor: FinancialActor) {
    requireTenantAdmin(actor);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))`;
        const current = await tx.advisorInternalCostRate.findFirst({
          where: { id, organizationId: actor.organizationId },
        });
        if (!current) throw new NotFoundException('Taux introuvable.');
        if (current.status !== 'PROPOSED')
          throw new ConflictException('Un taux PROPOSED est requis.');
        if (current.lockVersion !== dto.lockVersion)
          throw new ConflictException('Le taux a été modifié.');
        if (current.proposedByUserId === actor.userId)
          throw new ForbiddenException(
            'Le proposant ne peut pas approuver son propre taux.',
          );

        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${current.organizationId}:${current.userId}:${current.currency}`}, 0))`;
        const now = new Date();
        if (current.supersedesRateId) {
          const replaced = await tx.advisorInternalCostRate.updateMany({
            where: {
              id: current.supersedesRateId,
              organizationId: actor.organizationId,
              userId: current.userId,
              currency: current.currency,
              status: 'APPROVED',
            },
            data: {
              status: 'SUPERSEDED',
              supersededByUserId: actor.userId,
              supersededAt: now,
              supersededEffectiveAt: current.effectiveFrom,
              lockVersion: { increment: 1 },
            },
          });
          if (replaced.count !== 1)
            throw new ConflictException(
              'Le taux remplacé n’est plus approuvable.',
            );
        }

        const approved = await tx.advisorInternalCostRate.updateMany({
          where: { id, status: 'PROPOSED', lockVersion: dto.lockVersion },
          data: {
            status: 'APPROVED',
            approvedByUserId: actor.userId,
            approvedAt: now,
            lockVersion: { increment: 1 },
          },
        });
        if (approved.count !== 1)
          throw new ConflictException('Conflit d’approbation du taux.');
        const after = await tx.advisorInternalCostRate.findUniqueOrThrow({
          where: { id },
        });
        const retroactive =
          this.civilValue(current.effectiveFrom) < civilDateInToronto(now);
        await this.audit(
          tx,
          actor,
          retroactive
            ? 'ADVISOR_COST_RATE_RETROACTIVE_APPROVED'
            : 'ADVISOR_COST_RATE_APPROVED',
          id,
          current,
          { ...after, reason: dto.reason, retroactive },
        );
        return after;
      });
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  private async transition(
    id: string,
    expected: 'DRAFT' | 'PROPOSED',
    target: 'PROPOSED' | 'REJECTED',
    dto: CostRateTransitionDto,
    actor: FinancialActor,
  ) {
    requireTenantAdmin(actor);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))`;
      const current = await tx.advisorInternalCostRate.findFirst({
        where: { id, organizationId: actor.organizationId },
      });
      if (!current) throw new NotFoundException('Taux introuvable.');
      if (
        current.status !== expected ||
        current.lockVersion !== dto.lockVersion
      )
        throw new ConflictException(
          `Un taux ${expected} à la version attendue est requis.`,
        );
      const now = new Date();
      const result = await tx.advisorInternalCostRate.updateMany({
        where: { id, status: expected, lockVersion: dto.lockVersion },
        data:
          target === 'PROPOSED'
            ? {
                status: target,
                proposedByUserId: actor.userId,
                proposedAt: now,
                lockVersion: { increment: 1 },
              }
            : {
                status: target,
                rejectedByUserId: actor.userId,
                rejectedAt: now,
                rejectionReason: dto.reason,
                lockVersion: { increment: 1 },
              },
      });
      if (result.count !== 1)
        throw new ConflictException('Conflit de transition du taux.');
      const after = await tx.advisorInternalCostRate.findUniqueOrThrow({
        where: { id },
      });
      await this.audit(tx, actor, `ADVISOR_COST_RATE_${target}`, id, current, {
        ...after,
        reason: dto.reason,
      });
      return after;
    });
  }

  private civil(value: string, field: string) {
    return new Date(`${assertCivilDate(value, field)}T00:00:00.000Z`);
  }

  private civilValue(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private async audit(
    tx: Prisma.TransactionClient,
    actor: FinancialActor,
    action: string,
    targetId: string,
    beforeData: unknown,
    afterData: unknown,
  ) {
    await tx.adminAuditEvent.create({
      data: {
        actorUserId: actor.userId,
        actorDisplayName:
          `${actor.firstName ?? ''} ${actor.lastName ?? ''}`.trim() ||
          actor.userId,
        actorRole: actor.role,
        action,
        targetType: 'AdvisorInternalCostRate',
        targetId,
        organizationId: actor.organizationId,
        beforeData: beforeData as Prisma.InputJsonValue,
        afterData: afterData as Prisma.InputJsonValue,
      },
    });
  }

  private rethrowConflict(error: unknown): never {
    if (
      error instanceof BadRequestException ||
      error instanceof ConflictException ||
      error instanceof ForbiddenException ||
      error instanceof NotFoundException
    )
      throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError)
      throw new ConflictException(
        'Conflit de période, de version ou d’intégrité du taux.',
      );
    throw error;
  }
}
