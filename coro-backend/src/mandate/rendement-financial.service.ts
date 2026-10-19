import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlatformPermission, Prisma } from '@prisma/client';
import { WorkManagementActor } from '../auth/work-management-access';
import { PlatformAuthorityService } from '../auth/platform-authority.service';
import { PrismaService } from '../prisma/prisma.service';
import { governedCurrency } from '../common/financial-currency';
import {
  FinancialRendementQueryDto,
  RendementPeriodQueryDto,
  ValidateMandateSaleDto,
} from './rendement.dto';
import {
  assertCivilDate,
  civilDateInToronto,
  nextCivilDate,
  reportingRange,
  REPORTING_TIME_ZONE,
  startOfCivilDay,
} from './rendement-time';

type FinancialActor = WorkManagementActor & {
  firstName?: string;
  lastName?: string;
};

type OperationalAdvisor = {
  userId: string;
  userName: string;
  hours: number;
  activities: Map<string, { id: string; label: string }>;
  mandates: Map<
    string,
    { mandateId: string | null; projectId: string; projectName: string }
  >;
};

type FinancialTotal = {
  currency: string;
  soldAmount: Prisma.Decimal;
  knownLaborCost: Prisma.Decimal;
  contributionMargin: Prisma.Decimal;
  completeMandates: number;
  incompleteMandates: number;
  uniqueLossMakingMandates: number;
};

@Injectable()
export class RendementFinancialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformAuthority: PlatformAuthorityService,
  ) {}

  async operational(actor: FinancialActor, query: RendementPeriodQueryDto) {
    const userId = ['ADMIN', 'SUPER_ADMIN'].includes(actor.role)
      ? query.userId || undefined
      : actor.userId;
    const range = reportingRange(query.from, query.to);
    const entries = await this.prisma.taskTimeEntry.findMany({
      where: {
        task: { project: { organizationId: actor.organizationId } },
        ...(userId ? { userId } : {}),
        ...(range ? { date: range } : {}),
      },
      select: {
        id: true,
        date: true,
        heures: true,
        user: { select: { id: true, firstName: true, lastName: true } },
        task: {
          select: {
            id: true,
            taskTitle: true,
            categoryName: true,
            activity: { select: { id: true, label: true } },
            project: {
              select: {
                id: true,
                name: true,
                mandate: { select: { id: true } },
              },
            },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    });
    const advisors = new Map<string, OperationalAdvisor>();
    for (const entry of entries) {
      const current = advisors.get(entry.user.id) ?? {
        userId: entry.user.id,
        userName: `${entry.user.firstName} ${entry.user.lastName}`,
        hours: 0,
        activities: new Map<string, { id: string; label: string }>(),
        mandates: new Map<
          string,
          { mandateId: string | null; projectId: string; projectName: string }
        >(),
      };
      current.hours += entry.heures;
      if (entry.task.activity)
        current.activities.set(entry.task.activity.id, entry.task.activity);
      const mandateKey =
        entry.task.project.mandate?.id ?? `project:${entry.task.project.id}`;
      current.mandates.set(mandateKey, {
        mandateId: entry.task.project.mandate?.id ?? null,
        projectId: entry.task.project.id,
        projectName: entry.task.project.name,
      });
      advisors.set(entry.user.id, current);
    }
    return {
      period: {
        from: query.from ?? null,
        to: query.to ?? null,
        timeZone: REPORTING_TIME_ZONE,
        upperBoundExclusive: query.to ? nextCivilDate(query.to) : null,
      },
      advisors: [...advisors.values()].map((advisor) => ({
        userId: advisor.userId,
        userName: advisor.userName,
        hours: advisor.hours,
        activities: [...advisor.activities.values()],
        participatedMandates: [...advisor.mandates.values()],
      })),
    };
  }

  async financial(actor: FinancialActor, query: FinancialRendementQueryDto) {
    const organizationId = query.organizationId ?? actor.organizationId;
    await this.platformAuthority.requirePermission(
      actor,
      PlatformPermission.FINANCIAL_RENDEMENT_READ,
      organizationId,
    );
    const view = query.view ?? 'cumulative';
    const workRange =
      view === 'work-period' ? reportingRange(query.from, query.to) : undefined;
    const soldRange =
      view === 'sold-portfolio'
        ? this.civilRange(query.from, query.to)
        : undefined;
    const asOf = query.asOf
      ? startOfCivilDay(nextCivilDate(assertCivilDate(query.asOf, 'asOf')))
      : undefined;

    const mandates = await this.prisma.projectMandate.findMany({
      where: {
        organizationId,
        ...(query.currency ? { soldCurrency: query.currency } : {}),
        ...(soldRange ? { soldAt: soldRange } : {}),
        ...(query.userId
          ? {
              project: {
                projectTasks: {
                  some: { timeEntries: { some: { userId: query.userId } } },
                },
              },
            }
          : {}),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            client: { select: { name: true } },
            projectTasks: {
              select: {
                timeEntries: {
                  where: {
                    ...(workRange ? { date: workRange } : {}),
                    ...(!workRange && asOf ? { date: { lt: asOf } } : {}),
                  },
                  select: { id: true, userId: true, date: true, heures: true },
                },
              },
            },
          },
        },
      },
      orderBy: [{ soldCurrency: 'asc' }, { soldAt: 'asc' }, { id: 'asc' }],
    });
    const entries = mandates.flatMap((mandate) =>
      mandate.project.projectTasks.flatMap((task) => task.timeEntries),
    );
    const userIds = [...new Set(entries.map((entry) => entry.userId))];
    const currencies = [
      ...new Set(
        mandates
          .map((mandate) => mandate.soldCurrency)
          .filter((currency): currency is string => Boolean(currency)),
      ),
    ];
    const rates =
      userIds.length && currencies.length
        ? await this.prisma.advisorInternalCostRate.findMany({
            where: {
              organizationId,
              userId: { in: userIds },
              currency: { in: currencies },
              status: { in: ['APPROVED', 'SUPERSEDED'] },
            },
            orderBy: { effectiveFrom: 'asc' },
          })
        : [];

    const results = mandates.map((mandate) => {
      const mandateEntries = mandate.project.projectTasks.flatMap(
        (task) => task.timeEntries,
      );
      const reasons = new Set<string>();
      if (mandate.soldAmountDecimal === null) {
        reasons.add(
          mandate.montantVendu === null
            ? 'MISSING_SOLD_AMOUNT'
            : 'LEGACY_SOLD_AMOUNT_UNVALIDATED',
        );
      }
      if (!mandate.soldCurrency) reasons.add('MISSING_SOLD_CURRENCY');
      if (!mandate.soldAt || !mandate.soldValidatedAt)
        reasons.add('MISSING_VALIDATED_SOLD_DATE');
      if (mandateEntries.length === 0) reasons.add('NO_TIME_ENTRIES');

      let knownLaborCost = new Prisma.Decimal(0);
      let coveredEntries = 0;
      for (const entry of mandateEntries) {
        const workDate = civilDateInToronto(entry.date);
        const rate = rates.find((candidate) => {
          const rateEnd = this.rateEnd(candidate);
          return (
            candidate.userId === entry.userId &&
            candidate.currency === mandate.soldCurrency &&
            this.civilValue(candidate.effectiveFrom) <= workDate &&
            (!rateEnd || workDate < rateEnd)
          );
        });
        if (!rate) {
          reasons.add('MISSING_ADVISOR_COST_RATE');
          continue;
        }
        coveredEntries += 1;
        knownLaborCost = knownLaborCost.plus(
          new Prisma.Decimal(String(entry.heures)).times(rate.hourlyCost),
        );
      }
      if (coveredEntries !== mandateEntries.length && coveredEntries > 0)
        reasons.add('PARTIAL_LABOR_COST');

      const completeness = reasons.size === 0 ? 'COMPLETE' : 'INCOMPLETE';
      const mayCalculateMargin =
        completeness === 'COMPLETE' && view !== 'work-period';
      const sold = mandate.soldAmountDecimal;
      const margin =
        mayCalculateMargin && sold ? sold.minus(knownLaborCost) : null;
      const marginPercent =
        margin && sold && sold.greaterThan(0)
          ? margin.dividedBy(sold).times(100)
          : null;
      return {
        mandateId: mandate.id,
        projectId: mandate.projectId,
        projectName: mandate.project.name,
        clientName: mandate.project.client.name,
        soldAmount: sold?.toFixed(2) ?? null,
        soldCurrency: mandate.soldCurrency,
        soldAt: mandate.soldAt ? this.civilValue(mandate.soldAt) : null,
        knownLaborCost: this.money(knownLaborCost),
        coveredTimeEntries: coveredEntries,
        totalTimeEntries: mandateEntries.length,
        completeness:
          view === 'work-period' && reasons.size === 0
            ? 'NOT_AVAILABLE'
            : completeness,
        incompleteReasons:
          view === 'work-period'
            ? [...reasons, 'CUMULATIVE_MARGIN_NOT_AVAILABLE_FOR_WORK_PERIOD']
            : [...reasons],
        contributionMargin: margin ? this.money(margin) : null,
        contributionMarginPercent: marginPercent
          ? marginPercent
              .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
              .toFixed(2)
          : null,
        lossMaking: margin ? margin.lessThan(0) : null,
      };
    });

    const totals: Record<string, FinancialTotal> = {};
    for (const result of results) {
      const currency = result.soldCurrency ?? 'UNKNOWN';
      const current = totals[currency] ?? {
        currency,
        soldAmount: new Prisma.Decimal(0),
        knownLaborCost: new Prisma.Decimal(0),
        contributionMargin: new Prisma.Decimal(0),
        completeMandates: 0,
        incompleteMandates: 0,
        uniqueLossMakingMandates: 0,
      };
      if (result.soldAmount)
        current.soldAmount = current.soldAmount.plus(result.soldAmount);
      current.knownLaborCost = current.knownLaborCost.plus(
        result.knownLaborCost,
      );
      if (
        result.completeness === 'COMPLETE' &&
        result.contributionMargin !== null
      ) {
        current.completeMandates += 1;
        current.contributionMargin = current.contributionMargin.plus(
          result.contributionMargin,
        );
        if (result.lossMaking) current.uniqueLossMakingMandates += 1;
      } else current.incompleteMandates += 1;
      totals[currency] = current;
    }

    return {
      scope: {
        view,
        from: query.from ?? null,
        to: query.to ?? null,
        asOf: query.asOf ?? null,
        timeZone: REPORTING_TIME_ZONE,
        upperBoundExclusive: query.to ? nextCivilDate(query.to) : null,
      },
      mandates: results,
      totals: Object.values(totals).map((total) => ({
        ...total,
        soldAmount: this.money(total.soldAmount),
        knownLaborCost: this.money(total.knownLaborCost),
        contributionMargin: this.money(total.contributionMargin),
      })),
    };
  }

  async validateSale(
    mandateId: string,
    dto: ValidateMandateSaleDto,
    actor: FinancialActor,
  ) {
    const soldCurrency = governedCurrency(dto.soldCurrency, {
      defaultWhenMissing: true,
    });
    const mandateScope = await this.prisma.projectMandate.findUnique({
      where: { id: mandateId },
      select: { organizationId: true },
    });
    if (!mandateScope) throw new NotFoundException('Mandat introuvable.');
    await this.platformAuthority.requirePermission(
      actor,
      PlatformPermission.FINANCIAL_SALE_VALIDATE,
      mandateScope.organizationId,
    );
    const amount = new Prisma.Decimal(dto.soldAmount);
    if (!amount.isFinite() || amount.isNegative())
      throw new ConflictException(
        'Le montant vendu doit être fini et non négatif.',
      );
    const soldAt = new Date(
      `${assertCivilDate(dto.soldAt, 'soldAt')}T00:00:00.000Z`,
    );
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${mandateId}, 0))`;
        const before = await tx.projectMandate.findFirst({
          where: { id: mandateId, organizationId: mandateScope.organizationId },
        });
        if (!before) throw new NotFoundException('Mandat introuvable.');
        if (before.financialLockVersion !== dto.lockVersion)
          throw new ConflictException(
            'Les conditions financières ont été modifiées.',
          );
        const updated = await tx.projectMandate.updateMany({
          where: {
            id: mandateId,
            organizationId: mandateScope.organizationId,
            financialLockVersion: dto.lockVersion,
          },
          data: {
            soldAmountDecimal: amount,
            soldCurrency,
            soldAt,
            soldValidatedByUserId: actor.userId,
            soldValidatedAt: new Date(),
            soldValidationReason: dto.reason,
            financialLockVersion: { increment: 1 },
          },
        });
        if (updated.count !== 1)
          throw new ConflictException('Conflit de validation financière.');
        const after = await tx.projectMandate.findUniqueOrThrow({
          where: { id: mandateId },
        });
        const beforeJson = this.saleSnapshot(before);
        const afterJson = this.saleSnapshot(after);
        await tx.adminAuditEvent.create({
          data: {
            actorUserId: actor.userId,
            actorDisplayName:
              `${actor.firstName ?? ''} ${actor.lastName ?? ''}`.trim() ||
              actor.userId,
            actorRole: actor.role,
            action: 'PROJECT_MANDATE_SALE_VALIDATED',
            targetType: 'ProjectMandate',
            targetId: mandateId,
            organizationId: mandateScope.organizationId,
            reason: dto.reason,
            beforeData: beforeJson,
            afterData: afterJson,
          },
        });
        await tx.auditLog.create({
          data: {
            action: 'MANDATE_SALE_VALIDATED',
            entityType: 'ProjectMandate',
            entityId: mandateId,
            projectId: before.projectId,
            description: 'Conditions financières gouvernées validées.',
            metadata: {
              before: beforeJson,
              after: afterJson,
              reason: dto.reason,
            },
            userId: actor.userId,
            organizationId: mandateScope.organizationId,
          },
        });
        return afterJson;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientUnknownRequestError &&
        error.message.includes('FINANCIAL_SALE_ACTOR_NOT_AUTHORIZED')
      )
        throw new ForbiddenException({
          code: 'FINANCIAL_SALE_ACTOR_NOT_AUTHORIZED',
          message: 'Autorisation de validation financière requise.',
        });
      throw error;
    }
  }

  private civilRange(from?: string, to?: string) {
    if (!from || !to)
      throw new ConflictException(
        'from et to sont requis pour sold-portfolio.',
      );
    assertCivilDate(from, 'from');
    assertCivilDate(to, 'to');
    if (to < from)
      throw new ConflictException('to doit être postérieure ou égale à from.');
    return {
      gte: new Date(`${from}T00:00:00.000Z`),
      lt: new Date(`${nextCivilDate(to)}T00:00:00.000Z`),
    };
  }

  private rateEnd(rate: {
    effectiveUntil: Date | null;
    supersededEffectiveAt: Date | null;
  }) {
    const candidates = [rate.effectiveUntil, rate.supersededEffectiveAt]
      .filter((value): value is Date => Boolean(value))
      .map((value) => this.civilValue(value));
    return candidates.sort()[0] ?? null;
  }

  private civilValue(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private money(value: Prisma.Decimal) {
    return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2);
  }

  private saleSnapshot(mandate: {
    soldAmountDecimal: Prisma.Decimal | null;
    soldCurrency: string | null;
    soldAt: Date | null;
    soldValidatedByUserId: string | null;
    soldValidatedAt: Date | null;
    financialLockVersion: number;
  }): Prisma.InputJsonValue {
    return {
      soldAmount: mandate.soldAmountDecimal?.toFixed(2) ?? null,
      soldCurrency: mandate.soldCurrency,
      soldAt: mandate.soldAt?.toISOString().slice(0, 10) ?? null,
      soldValidatedByUserId: mandate.soldValidatedByUserId,
      soldValidatedAt: mandate.soldValidatedAt?.toISOString() ?? null,
      financialLockVersion: mandate.financialLockVersion,
    };
  }
}
