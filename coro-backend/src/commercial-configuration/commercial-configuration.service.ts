import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { CommercialCatalogService } from '../commercial-catalog/commercial-catalog.service';
import { CommercialSimulatorService } from '../commercial-simulator/commercial-simulator.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  COMMERCIAL_CONFIGURATION_DEFINITIONS,
  definitionFingerprint,
  stableHash,
} from './commercial-configuration.registry';

type Actor = { userId: string };
type ItemStatus =
  | 'MISSING'
  | 'MATCH'
  | 'CONFLICT'
  | 'EXTRA_RELEVANT'
  | 'BLOCKED';

@Injectable()
export class CommercialConfigurationService {
  private readonly locks = new Map<string, Promise<unknown>>();
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CommercialCatalogService,
    private readonly simulator: CommercialSimulatorService,
    private readonly audit: AdminAuditService,
  ) {}

  listDefinitions() {
    return COMMERCIAL_CONFIGURATION_DEFINITIONS.map((d) => ({
      code: d.code,
      version: d.version,
      labelFr: d.labelFr,
      labelEn: d.labelEn,
      definitionFingerprint: definitionFingerprint(d),
    }));
  }
  private definition(code: string) {
    const d = COMMERCIAL_CONFIGURATION_DEFINITIONS.find(
      (x) => `${x.code}/${x.version}` === code || x.code === code,
    );
    if (!d) throw new NotFoundException({ code: 'DEFINITION_NOT_FOUND' });
    return d;
  }
  private async locked<T>(key: string, work: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const chain = previous.then(() => current);
    this.locks.set(key, chain);
    await previous;
    try {
      return await work();
    } finally {
      release();
      if (this.locks.get(key) === chain) this.locks.delete(key);
    }
  }

  async analyze(code: string) {
    const d = this.definition(code);
    const books = await this.prisma.priceBook.findMany({
      where: { code: d.priceBook.code },
      include: {
        versions: {
          include: {
            components: {
              include: { tiers: { orderBy: { displayOrder: 'asc' } } },
            },
          },
          orderBy: { versionNumber: 'desc' },
        },
      },
    });
    if (books.length > 1)
      throw new ConflictException({ code: 'TARGET_AMBIGUOUS' });
    const book = books[0] ?? null;
    const drafts = book?.versions.filter((v) => v.status === 'DRAFT') ?? [];
    const active =
      book?.versions.filter((v) =>
        ['ACTIVE', 'SCHEDULED'].includes(v.status),
      ) ?? [];
    if (drafts.length > 1)
      throw new ConflictException({ code: 'TARGET_AMBIGUOUS' });
    const version = drafts[0] ?? active[0] ?? null;
    const items: Array<{
      kind: string;
      code: string;
      status: ItemStatus;
      action: string;
      detail?: string;
    }> = [];
    items.push({
      kind: 'PRICE_BOOK',
      code: d.priceBook.code,
      status:
        book &&
        book.audience === d.priceBook.audience &&
        book.currency === d.priceBook.currency
          ? 'MATCH'
          : book
            ? 'CONFLICT'
            : 'MISSING',
      action: book ? 'REUSE' : 'CREATE',
    });
    items.push({
      kind: 'VERSION',
      code: 'v1',
      status: version ? 'MATCH' : 'MISSING',
      action: version ? 'REUSE' : 'CREATE_DRAFT',
    });
    const expected = new Set<string>(d.components.map((c) => c.code));
    for (const c of d.components) {
      const actual = version?.components.find((x) => x.code === c.code);
      if (!actual) {
        items.push({
          kind: 'COMPONENT',
          code: c.code,
          status: 'MISSING',
          action: 'CREATE',
        });
        continue;
      }
      const metadata =
        actual.nameFr === c.nameFr &&
        actual.nameEn === c.nameEn &&
        actual.pricingModel === c.pricingModel &&
        actual.chargeType === c.chargeType &&
        actual.revenueCategory === c.revenueCategory &&
        actual.metric === c.metric &&
        (actual.billingPeriod ?? null) ===
          ('billingPeriod' in c ? c.billingPeriod : null) &&
        (actual.amountMinor?.toString() ?? null) ===
          ('amountMinor' in c ? c.amountMinor : null);
      items.push({
        kind: 'COMPONENT',
        code: c.code,
        status: metadata ? 'MATCH' : 'CONFLICT',
        action: metadata ? 'REUSE' : 'BLOCK',
      });
      if ('tiers' in c) {
        c.tiers.forEach(([min, max, amount], i) => {
          const t = actual.tiers[i];
          const match =
            t &&
            t.minimumQuantity.toString() === String(min) &&
            t.maximumQuantity?.toString() === String(max) &&
            t.amountMinor.toString() === String(amount);
          items.push({
            kind: 'TIER',
            code: `${c.code}:${min}-${max - 1}`,
            status: match ? 'MATCH' : t ? 'CONFLICT' : 'MISSING',
            action: match ? 'REUSE' : t ? 'BLOCK' : 'CREATE',
          });
        });
        if (actual.tiers.length > c.tiers.length)
          items.push({
            kind: 'TIER',
            code: `${c.code}:EXTRA`,
            status: 'EXTRA_RELEVANT',
            action: 'BLOCK',
          });
      }
    }
    version?.components
      .filter((c) => !expected.has(c.code))
      .forEach((c) =>
        items.push({
          kind: 'COMPONENT',
          code: c.code,
          status: 'EXTRA_RELEVANT',
          action: 'BLOCK',
        }),
      );
    const costSets = await this.prisma.commercialCostAssumptionSet.findMany({
      where: { code: d.cost.code },
      include: {
        versions: {
          include: { values: true },
          orderBy: { versionNumber: 'desc' },
        },
      },
    });
    if (costSets.length > 1)
      throw new ConflictException({ code: 'TARGET_AMBIGUOUS' });
    const costSet = costSets[0] ?? null;
    const costDraft =
      costSet?.versions.filter((v) => v.status === 'DRAFT') ?? [];
    if (costDraft.length > 1)
      throw new ConflictException({ code: 'TARGET_AMBIGUOUS' });
    const costVersion =
      costDraft[0] ??
      costSet?.versions.find((v) => v.status === 'PUBLISHED') ??
      null;
    items.push({
      kind: 'COST_SET',
      code: d.cost.code,
      status: costSet ? 'MATCH' : 'MISSING',
      action: costSet ? 'REUSE' : 'CREATE',
    });
    if (!costVersion)
      items.push({
        kind: 'COST_VERSION',
        code: 'direct-cost/v2',
        status: 'MISSING',
        action: 'CREATE',
      });
    else {
      const actual = costVersion.values.map((v) => ({
        assumptionCode: v.assumptionCode,
        assumptionVersion: v.assumptionVersion,
        scopeKey: v.scopeKey,
        valueType: v.valueType,
        decimalValue: v.decimalValue?.toString() ?? null,
        moneyMinorValue: v.moneyMinorValue?.toString() ?? null,
        currency: v.currency ?? null,
        unit: v.unit,
      }));
      const desired = d.cost.values.map((v) => ({
        assumptionCode: v.assumptionCode,
        assumptionVersion: v.assumptionVersion,
        scopeKey: v.scopeKey,
        valueType: v.valueType,
        decimalValue: 'decimalValue' in v ? v.decimalValue : null,
        moneyMinorValue: 'moneyMinorValue' in v ? v.moneyMinorValue : null,
        currency: 'currency' in v ? v.currency : null,
        unit: v.unit,
      }));
      const match =
        stableHash(
          actual.sort((a, b) => a.scopeKey.localeCompare(b.scopeKey)),
        ) ===
        stableHash(
          desired.sort((a, b) => a.scopeKey.localeCompare(b.scopeKey)),
        );
      items.push({
        kind: 'COST_VERSION',
        code: 'direct-cost/v2',
        status: match ? 'MATCH' : 'CONFLICT',
        action: match ? 'REUSE' : 'BLOCK',
      });
    }
    const blockers = items.filter((i) =>
      ['CONFLICT', 'EXTRA_RELEVANT', 'BLOCKED'].includes(i.status),
    );
    const missing = items.filter((i) => i.status === 'MISSING');
    const snapshot = {
      definition: `${d.code}/${d.version}`,
      priceBook: book
        ? {
            id: book.id,
            code: book.code,
            audience: book.audience,
            currency: book.currency,
          }
        : null,
      version: version
        ? {
            id: version.id,
            versionNumber: version.versionNumber,
            status: version.status,
            components: version.components.map((c) => ({
              code: c.code,
              nameFr: c.nameFr,
              nameEn: c.nameEn,
              pricingModel: c.pricingModel,
              chargeType: c.chargeType,
              revenueCategory: c.revenueCategory,
              billingPeriod: c.billingPeriod,
              metric: c.metric,
              amountMinor: c.amountMinor?.toString() ?? null,
              tiers: c.tiers.map((t) => ({
                min: t.minimumQuantity.toString(),
                max: t.maximumQuantity?.toString() ?? null,
                amountMinor: t.amountMinor.toString(),
              })),
            })),
          }
        : null,
      cost: costVersion
        ? {
            setId: costSet.id,
            versionId: costVersion.id,
            status: costVersion.status,
            methodology: `${costVersion.methodologyCode}/${costVersion.methodologyVersion}`,
            values: costVersion.values.map((v) => ({
              code: v.assumptionCode,
              scope: v.scopeKey,
              decimal: v.decimalValue?.toString() ?? null,
              money: v.moneyMinorValue?.toString() ?? null,
            })),
          }
        : null,
    };
    const fingerprint = stableHash(snapshot);
    const deployment = version
      ? await this.prisma.commercialConfigurationDeployment.findUnique({
          where: {
            definitionCode_definitionVersion_priceBookVersionId: {
              definitionCode: d.code,
              definitionVersion: d.version,
              priceBookVersionId: version.id,
            },
          },
          include: {
            approvedBy: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        })
      : null;
    const published =
      version &&
      ['ACTIVE', 'SCHEDULED'].includes(version.status) &&
      costVersion?.status === 'PUBLISHED';
    const status = blockers.length
      ? 'CONFLICT'
      : missing.length
        ? book
          ? 'PARTIALLY_CONFIGURED'
          : 'NOT_INSTALLED'
        : published
          ? 'PUBLISHED'
          : deployment?.status === 'APPROVED' &&
              deployment.configurationFingerprint === fingerprint
            ? 'APPROVED'
            : 'READY_FOR_REVIEW';
    return {
      definition: {
        code: d.code,
        version: d.version,
        labelFr: d.labelFr,
        labelEn: d.labelEn,
        fingerprint: definitionFingerprint(d),
      },
      status,
      items,
      blockers,
      missingCount: missing.length,
      changes: missing.length,
      configurationFingerprint: fingerprint,
      target: {
        priceBookId: book?.id ?? null,
        priceBookVersionId: version?.id ?? null,
        priceBookVersionNumber: version?.versionNumber ?? null,
        priceBookVersionStatus: version?.status ?? null,
        costAssumptionSetId: costSet?.id ?? null,
        costAssumptionVersionId: costVersion?.id ?? null,
        costAssumptionVersionStatus: costVersion?.status ?? null,
      },
      approval: deployment
        ? {
            status: deployment.status,
            approvedByUserId: deployment.approvedByUserId,
            approvedByDisplayName: deployment.approvedBy
              ? `${deployment.approvedBy.firstName} ${deployment.approvedBy.lastName}`.trim() ||
                deployment.approvedBy.email
              : null,
            approvedAt: deployment.approvedAt?.toISOString() ?? null,
            publishedAt: deployment.publishedAt?.toISOString() ?? null,
            current:
              deployment.configurationFingerprint === fingerprint &&
              deployment.status === 'APPROVED',
          }
        : null,
    };
  }

  async apply(code: string, actor: Actor) {
    return this.locked(code, async () => {
      const d = this.definition(code);
      const before = await this.analyze(code);
      if (before.status === 'PUBLISHED') return before;
      if (before.blockers.length)
        throw new ConflictException({
          code: before.blockers.some((b) => b.status === 'EXTRA_RELEVANT')
            ? 'EXTRA_RELEVANT_CONFIGURATION'
            : 'CONFIGURATION_CONFLICT',
          items: before.blockers,
        });
      let bookId = before.target.priceBookId;
      if (!bookId)
        bookId = (await this.catalog.createPriceBook(d.priceBook, actor)).id;
      let versionId = before.target.priceBookVersionId;
      if (!versionId)
        versionId = (await this.catalog.createVersion(bookId, {}, actor)).id;
      const current = await this.prisma.priceComponent.findMany({
        where: { priceBookVersionId: versionId },
        include: { tiers: true },
      });
      for (const c of d.components) {
        let actual = current.find((x) => x.code === c.code);
        if (!actual) {
          actual = (await this.catalog.createComponent(
            versionId,
            {
              code: c.code,
              capabilityCode: 'COMPLIANCE_OPERATIONS',
              nameFr: c.nameFr,
              nameEn: c.nameEn,
              pricingModel: c.pricingModel,
              chargeType: c.chargeType,
              revenueCategory: c.revenueCategory,
              billingPeriod: 'billingPeriod' in c ? c.billingPeriod : undefined,
              metric: c.metric,
              amountMinor: 'amountMinor' in c ? c.amountMinor : undefined,
              displayOrder: c.displayOrder,
            },
            actor,
          )) as never;
        }
        if ('tiers' in c) {
          const existing =
            (
              actual as {
                tiers?: Array<{ minimumQuantity: { toString(): string } }>;
              }
            ).tiers ?? [];
          for (const [i, [min, max, amount]] of c.tiers.entries())
            if (
              !existing.some(
                (t) => t.minimumQuantity.toString() === String(min),
              )
            )
              await this.catalog.createTier(
                versionId,
                (actual as { id: string }).id,
                {
                  minimumQuantity: String(min),
                  maximumQuantity: String(max),
                  amountMinor: String(amount),
                  displayOrder: (i + 1) * 10,
                },
                actor,
              );
        }
      }
      let costSetId = before.target.costAssumptionSetId;
      if (!costSetId)
        costSetId = (
          await this.simulator.createCostAssumptionSet(
            { code: d.cost.code, name: d.cost.name },
            actor,
          )
        ).id;
      let costVersionId = before.target.costAssumptionVersionId;
      if (!costVersionId)
        costVersionId = (
          await this.simulator.createCostAssumptionVersion(
            costSetId,
            {
              currency: d.cost.currency,
              methodologyCode: d.cost.methodologyCode,
              methodologyVersion: d.cost.methodologyVersion,
              values: d.cost.values.map((v) => ({ ...v })),
            },
            actor,
          )
        ).id;
      const after = await this.analyze(code);
      if (after.blockers.length || after.missingCount)
        throw new ConflictException({ code: 'PARTIAL_APPLY', analysis: after });
      await this.prisma.$transaction(async (tx) => {
        await tx.commercialConfigurationDeployment.upsert({
          where: {
            definitionCode_definitionVersion_priceBookVersionId: {
              definitionCode: d.code,
              definitionVersion: d.version,
              priceBookVersionId: versionId,
            },
          },
          create: {
            definitionCode: d.code,
            definitionVersion: d.version,
            definitionFingerprint: definitionFingerprint(d),
            priceBookId: bookId,
            priceBookVersionId: versionId,
            costAssumptionSetId: costSetId,
            costAssumptionVersionId: costVersionId,
            configurationFingerprint: after.configurationFingerprint,
            status: 'APPLIED',
          },
          update: {
            definitionFingerprint: definitionFingerprint(d),
            costAssumptionSetId: costSetId,
            costAssumptionVersionId: costVersionId,
            configurationFingerprint: after.configurationFingerprint,
            status: 'APPLIED',
            approvedByUserId: null,
            approvedAt: null,
            lockVersion: { increment: 1 },
          },
        });
        await this.audit.record(tx, {
          actorUserId: actor.userId,
          action: 'COMMERCIAL_CONFIGURATION_APPLIED',
          targetType: 'CommercialConfiguration',
          targetId: versionId,
          targetLabel: `${d.code}/${d.version}`,
          afterData: {
            definitionFingerprint: definitionFingerprint(d),
            configurationFingerprint: after.configurationFingerprint,
          },
        });
      });
      return this.analyze(code);
    });
  }

  async review(code: string) {
    const d = this.definition(code);
    const a = await this.analyze(code);
    if (a.blockers.length || a.missingCount)
      throw new ConflictException({ code: 'CONFIGURATION_CONFLICT' });
    const book = await this.prisma.priceBook.findUniqueOrThrow({
      where: { id: a.target.priceBookId },
      include: {
        versions: {
          where: { id: a.target.priceBookVersionId },
          include: {
            components: {
              include: { tiers: { orderBy: { displayOrder: 'asc' } } },
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    });
    const cost =
      await this.prisma.commercialCostAssumptionVersion.findUniqueOrThrow({
        where: { id: a.target.costAssumptionVersionId },
        include: { values: true },
      });
    return {
      definition: a.definition,
      status: a.status,
      configurationFingerprint: a.configurationFingerprint,
      approval: a.approval,
      title: book.name,
      subscription: book.versions[0].components
        .find((c) => c.code === 'CORO_PROFESSIONAL_ANNUAL')!
        .tiers.map((t) => ({
          from: t.minimumQuantity.toString(),
          through: (Number(t.maximumQuantity) - 1).toString(),
          amountMinor: t.amountMinor.toString(),
        })),
      implementation: book.versions[0].components
        .filter((c) => c.revenueCategory === 'IMPLEMENTATION')
        .map((c) => ({
          labelFr: c.nameFr,
          labelEn: c.nameEn,
          amountMinor: c.amountMinor!.toString(),
        })),
      professionalServices: book.versions[0].components
        .filter((c) => c.revenueCategory === 'PROFESSIONAL_SERVICE')
        .map((c) => ({
          labelFr: c.nameFr,
          labelEn: c.nameEn,
          amountMinor: c.amountMinor!.toString(),
          unit: 'HOUR',
        })),
      internal: {
        warning: 'INTERNAL — NOT CUSTOMER VISIBLE',
        methodology: `${cost.methodologyCode}/${cost.methodologyVersion}`,
        values: cost.values.map((v) => ({
          code: v.assumptionCode,
          scope: v.scopeKey,
          moneyMinor: v.moneyMinorValue?.toString() ?? null,
          decimal: v.decimalValue?.toString() ?? null,
          unit: v.unit,
        })),
      },
      policies: d.policies,
    };
  }

  async approve(code: string, reason: string, actor: Actor) {
    const d = this.definition(code);
    const a = await this.analyze(code);
    if (a.blockers.length || a.missingCount)
      throw new ConflictException({ code: 'CONFIGURATION_CONFLICT' });
    if (!a.target.priceBookVersionId)
      throw new BadRequestException({ code: 'NO_APPLICABLE_DRAFT' });
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.commercialConfigurationDeployment.upsert({
        where: {
          definitionCode_definitionVersion_priceBookVersionId: {
            definitionCode: d.code,
            definitionVersion: d.version,
            priceBookVersionId: a.target.priceBookVersionId,
          },
        },
        create: {
          definitionCode: d.code,
          definitionVersion: d.version,
          definitionFingerprint: definitionFingerprint(d),
          priceBookId: a.target.priceBookId,
          priceBookVersionId: a.target.priceBookVersionId,
          costAssumptionSetId: a.target.costAssumptionSetId,
          costAssumptionVersionId: a.target.costAssumptionVersionId,
          configurationFingerprint: a.configurationFingerprint,
          status: 'APPROVED',
          approvedByUserId: actor.userId,
          approvedAt: now,
        },
        update: {
          configurationFingerprint: a.configurationFingerprint,
          status: 'APPROVED',
          approvedByUserId: actor.userId,
          approvedAt: now,
          lockVersion: { increment: 1 },
        },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'COMMERCIAL_CONFIGURATION_APPROVED',
        targetType: 'CommercialConfiguration',
        targetId: row.id,
        targetLabel: `${d.code}/${d.version}`,
        reason,
        afterData: { configurationFingerprint: a.configurationFingerprint },
      });
      return {
        status: row.status,
        approvedAt: row.approvedAt?.toISOString(),
        configurationFingerprint: row.configurationFingerprint,
      };
    });
  }

  async publish(
    code: string,
    effectiveFrom: string,
    reason: string,
    actor: Actor,
  ) {
    return this.locked(`${code}:publish`, async () => {
      const d = this.definition(code);
      const a = await this.analyze(code);
      const deployment = a.target.priceBookVersionId
        ? await this.prisma.commercialConfigurationDeployment.findUnique({
            where: {
              definitionCode_definitionVersion_priceBookVersionId: {
                definitionCode: d.code,
                definitionVersion: d.version,
                priceBookVersionId: a.target.priceBookVersionId,
              },
            },
          })
        : null;
      if (!deployment?.approvedAt || deployment.status !== 'APPROVED')
        throw new ConflictException({ code: 'APPROVAL_REQUIRED' });
      if (deployment.configurationFingerprint !== a.configurationFingerprint)
        throw new ConflictException({ code: 'APPROVAL_STALE' });
      let costPublished = false;
      try {
        await this.simulator.transitionAssumption(
          'cost',
          deployment.costAssumptionVersionId,
          'publish',
          reason,
          actor,
        );
        costPublished = true;
        await this.prisma.commercialConfigurationDeployment.update({
          where: { id: deployment.id },
          data: { status: 'COST_PUBLISHED', lockVersion: { increment: 1 } },
        });
        await this.catalog.publishVersion(
          deployment.priceBookVersionId,
          { effectiveFrom, reason },
          actor,
        );
        const row = await this.prisma.commercialConfigurationDeployment.update({
          where: { id: deployment.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
            lockVersion: { increment: 1 },
          },
        });
        return {
          status: row.status,
          publishedAt: row.publishedAt?.toISOString(),
        };
      } catch (error) {
        if (!costPublished) throw error;
        await this.prisma.commercialConfigurationDeployment.update({
          where: { id: deployment.id },
          data: {
            status: 'PARTIALLY_PUBLISHED',
            lockVersion: { increment: 1 },
          },
        });
        throw new ConflictException({
          code: 'PARTIAL_PUBLICATION',
          recovery:
            'Inspect Cost and PriceBook lifecycle states; never roll back immutable publication.',
          cause: error instanceof Error ? error.message : 'unknown',
        });
      }
    });
  }
}
