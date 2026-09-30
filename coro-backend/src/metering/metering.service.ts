import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MeteringResult, Prisma } from '@prisma/client';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  calculationKey,
  canonicalJson,
  sourceFingerprint,
} from './calculation-identity';
import { CalculateMeteringDto, ListMeteringDto } from './metering.dto';
import { METRIC_REGISTRY, metricDefinition } from './metric-registry';
import { buildSourceSummary } from './source-summary';
import {
  CalculationTarget,
  MetricDefinition,
  NormalizedSourceFact,
} from './metering.types';

type Tx = Prisma.TransactionClient;
type Actor = { userId: string; role: string };
type MeteringResultWithStatus = MeteringResult & {
  supersededBy?: { id: string } | null;
};

@Injectable()
export class MeteringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}
  metrics() {
    return METRIC_REGISTRY;
  }

  async list(organizationId: string, query: ListMeteringDto) {
    await this.organization(organizationId);
    const where: Prisma.MeteringResultWhereInput = {
      organizationId,
      ...(query.metricCode ? { metricCode: query.metricCode } : {}),
      ...(query.scope ? { scope: query.scope } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.buildingId ? { buildingId: query.buildingId } : {}),
      ...(query.periodStart || query.periodEnd
        ? {
            periodStart: {
              ...(query.periodStart ? { gte: query.periodStart } : {}),
              ...(query.periodEnd ? { lt: query.periodEnd } : {}),
            },
          }
        : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.meteringResult.count({ where }),
      this.prisma.meteringResult.findMany({
        where,
        include: { supersededBy: { select: { id: true } } },
        orderBy: [{ calculatedAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items: items.map((item) => this.serialize(item)),
      pagination: { page: query.page, pageSize: query.pageSize, total },
      billingStatus: 'NOT_EVALUATED',
      enforcement: 'NONE',
    };
  }

  async history(
    organizationId: string,
    metricCode: string,
    query: ListMeteringDto,
  ) {
    return this.list(organizationId, Object.assign(query, { metricCode }));
  }

  async calculate(
    organizationId: string,
    dto: CalculateMeteringDto,
    actor: Actor,
  ) {
    const definition = this.validateRequest(dto);
    const target = await this.target(this.prisma, organizationId, dto);
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await this.lockSeries(tx, definition, target, dto);
          const current = await this.current(tx, definition, target, dto);
          const calculated = await this.calculateMetric(
            tx,
            definition,
            target,
            dto,
          );
          const identity = this.identities(
            definition,
            target,
            dto,
            calculated.facts,
          );
          if (current) {
            if (current.sourceFingerprint === identity.sourceFingerprint) {
              this.assertIntegrity(
                current,
                definition,
                target,
                dto,
                calculated,
                identity,
              );
              return { created: false, result: this.serialize(current) };
            }
            throw new ConflictException({
              code: 'SERIES_SOURCE_CHANGED',
              message:
                'La série existe avec des sources différentes. Utilisez la correction explicite.',
              currentResultId: current.id,
            });
          }
          const result = await this.insert(
            tx,
            definition,
            target,
            dto,
            calculated,
            identity,
            actor,
          );
          await this.audit.record(tx, {
            actorUserId: actor.userId,
            action: 'METERING_RESULT_CALCULATED',
            targetType: 'MeteringResult',
            targetId: result.id,
            organizationId,
            afterData: this.auditSnapshot(result),
          });
          return { created: true, result: this.serialize(result) };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
    } catch (error) {
      if (!this.isUniqueConflict(error, 'calculationKey')) throw error;
      return this.resolveCalculationKeyRace(definition, target, dto);
    }
  }

  async correct(
    organizationId: string,
    resultId: string,
    reason: string,
    actor: Actor,
  ) {
    const normalizedReason = this.audit.normalizeReason(reason, true);
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          let previous = await tx.meteringResult.findFirst({
            where: { id: resultId, organizationId },
            include: { supersededBy: true },
          });
          if (!previous)
            throw new NotFoundException('Résultat de mesure introuvable.');
          const definition = metricDefinition(previous.metricCode);
          if (
            !definition ||
            definition.metricVersion !== previous.metricVersion ||
            definition.policyVersion !== previous.policyVersion
          )
            throw new ConflictException(
              'La version historique du calculateur n’est plus disponible.',
            );
          const dto: CalculateMeteringDto = {
            metricCode: previous.metricCode,
            scope: previous.scope,
            clientId: previous.clientId ?? undefined,
            buildingId: previous.buildingId ?? undefined,
            periodStart: previous.periodStart,
            periodEnd: previous.periodEnd,
            timezone: previous.timezone,
          };
          const target = await this.target(tx, organizationId, dto);
          await this.lockSeries(tx, definition, target, dto);
          previous = await tx.meteringResult.findFirst({
            where: { id: resultId, organizationId },
            include: { supersededBy: true },
          });
          if (!previous)
            throw new NotFoundException('Résultat de mesure introuvable.');
          if (previous.supersededBy)
            throw new ConflictException({
              code: 'RESULT_ALREADY_SUPERSEDED',
              currentResultId: previous.supersededBy.id,
            });
          const calculated = await this.calculateMetric(
            tx,
            definition,
            target,
            dto,
          );
          const identity = this.identities(
            definition,
            target,
            dto,
            calculated.facts,
          );
          if (identity.sourceFingerprint === previous.sourceFingerprint)
            return {
              corrected: false,
              previousResultId: previous.id,
              result: this.serialize(previous),
              reason: 'SOURCE_UNCHANGED',
            };
          const result = await this.insert(
            tx,
            definition,
            target,
            dto,
            calculated,
            identity,
            actor,
            previous.id,
            normalizedReason!,
          );
          await this.audit.record(tx, {
            actorUserId: actor.userId,
            action: 'METERING_RESULT_SUPERSEDED',
            targetType: 'MeteringResult',
            targetId: result.id,
            organizationId,
            reason: normalizedReason,
            beforeData: this.auditSnapshot(previous),
            afterData: this.auditSnapshot(result),
          });
          return {
            corrected: true,
            previousResultId: previous.id,
            result: this.serialize(result),
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
    } catch (error) {
      if (!this.isUniqueConflict(error, 'supersedesResultId')) throw error;
      const result = await this.prisma.meteringResult.findFirst({
        where: { id: resultId, organizationId },
        include: { supersededBy: { select: { id: true } } },
      });
      if (!result)
        throw new NotFoundException('Résultat de mesure introuvable.');
      throw new ConflictException({
        code: 'RESULT_ALREADY_SUPERSEDED',
        currentResultId: result.supersededBy?.id,
      });
    }
  }

  private validateRequest(dto: CalculateMeteringDto) {
    const definition = metricDefinition(dto.metricCode);
    if (!definition) throw new BadRequestException('Métrique inconnue.');
    if (!definition.allowedScopes.includes(dto.scope))
      throw new BadRequestException(
        'Portée non autorisée pour cette métrique.',
      );
    if (!(dto.periodEnd > dto.periodStart))
      throw new BadRequestException('La fin de période doit suivre le début.');
    if (
      (dto.periodEnd.getTime() - dto.periodStart.getTime()) / 86400000 >
      definition.maxPeriodDays
    )
      throw new BadRequestException(
        `La période dépasse ${definition.maxPeriodDays} jours.`,
      );
    try {
      new Intl.DateTimeFormat('en', { timeZone: dto.timezone }).format();
    } catch {
      throw new BadRequestException('Timezone IANA invalide.');
    }
    return definition;
  }

  private async organization(organizationId: string) {
    if (
      !(await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Organisation introuvable.');
  }
  private async target(
    db: PrismaService | Tx,
    organizationId: string,
    dto: CalculateMeteringDto,
  ): Promise<CalculationTarget> {
    const shape =
      (dto.scope === 'ORGANIZATION' && !dto.clientId && !dto.buildingId) ||
      (dto.scope === 'CLIENT' && !!dto.clientId && !dto.buildingId) ||
      (dto.scope === 'SITE' && !!dto.clientId && !!dto.buildingId);
    if (!shape)
      throw new BadRequestException('La cible ne correspond pas à la portée.');
    if (
      !(await db.organization.findUnique({
        where: { id: organizationId },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Organisation introuvable.');
    if (
      dto.clientId &&
      !(await db.client.findFirst({
        where: { id: dto.clientId, organizationId },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Client introuvable.');
    if (
      dto.buildingId &&
      !(await db.building.findFirst({
        where: { id: dto.buildingId, clientId: dto.clientId, organizationId },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Site introuvable.');
    return {
      organizationId,
      scope: dto.scope,
      clientId: dto.clientId,
      buildingId: dto.buildingId,
    };
  }

  private whereTarget(target: CalculationTarget) {
    return {
      organizationId: target.organizationId,
      ...(target.clientId ? { building: { clientId: target.clientId } } : {}),
      ...(target.buildingId ? { buildingId: target.buildingId } : {}),
    };
  }
  private async calculateMetric(
    tx: Tx,
    definition: MetricDefinition,
    target: CalculationTarget,
    dto: CalculateMeteringDto,
  ) {
    const range = { gte: dto.periodStart, lt: dto.periodEnd };
    let rows: Array<{ id: string; at: Date; buildingId: string }> = [];
    if (definition.code === 'INCIDENTS_STARTED')
      rows = (
        await tx.incidentEvent.findMany({
          where: { ...this.whereTarget(target), triggeredAt: range },
          select: { id: true, triggeredAt: true, buildingId: true },
          orderBy: { id: 'asc' },
        })
      ).map((x) => ({ id: x.id, at: x.triggeredAt, buildingId: x.buildingId }));
    else if (definition.code === 'EVACUATIONS_STARTED')
      rows = (
        await tx.evacuationEvent.findMany({
          where: { ...this.whereTarget(target), triggeredAt: range },
          select: { id: true, triggeredAt: true, buildingId: true },
          orderBy: { id: 'asc' },
        })
      ).map((x) => ({ id: x.id, at: x.triggeredAt, buildingId: x.buildingId }));
    else if (definition.code === 'OCCUPANCY_EVENTS')
      rows = (
        await tx.occupancyRecord.findMany({
          where: { ...this.whereTarget(target), checkedInAt: range },
          select: { id: true, checkedInAt: true, buildingId: true },
          orderBy: { id: 'asc' },
        })
      ).map((x) => ({ id: x.id, at: x.checkedInAt, buildingId: x.buildingId }));
    else if (definition.code === 'UNIQUE_OBSERVED_SENTINELLE_SITES') {
      const clientId = target.clientId ?? null;
      const buildingId = target.buildingId ?? null;
      rows = await tx.$queryRaw<
        Array<{ id: string; at: Date; buildingId: string }>
      >`
        SELECT 'occupancy:' || o.id AS id, o."checkedInAt" AS at, o."buildingId"
        FROM "OccupancyRecord" o
        JOIN "Building" b ON b.id = o."buildingId"
        WHERE o."organizationId" = ${target.organizationId}
          AND o."checkedInAt" >= ${dto.periodStart} AND o."checkedInAt" < ${dto.periodEnd}
          AND (${clientId}::text IS NULL OR b."clientId" = ${clientId})
          AND (${buildingId}::text IS NULL OR o."buildingId" = ${buildingId})
        UNION ALL
        SELECT 'evacuation:' || e.id, e."triggeredAt", e."buildingId"
        FROM "EvacuationEvent" e
        JOIN "Building" b ON b.id = e."buildingId"
        WHERE e."organizationId" = ${target.organizationId}
          AND e."triggeredAt" >= ${dto.periodStart} AND e."triggeredAt" < ${dto.periodEnd}
          AND (${clientId}::text IS NULL OR b."clientId" = ${clientId})
          AND (${buildingId}::text IS NULL OR e."buildingId" = ${buildingId})
        UNION ALL
        SELECT 'incident:' || i.id, i."triggeredAt", i."buildingId"
        FROM "IncidentEvent" i
        JOIN "Building" b ON b.id = i."buildingId"
        WHERE i."organizationId" = ${target.organizationId}
          AND i."triggeredAt" >= ${dto.periodStart} AND i."triggeredAt" < ${dto.periodEnd}
          AND (${clientId}::text IS NULL OR b."clientId" = ${clientId})
          AND (${buildingId}::text IS NULL OR i."buildingId" = ${buildingId})
        ORDER BY id`;
    } else if (definition.code === 'POPULATION_OPERATIONAL_EVENTS') {
      const found = await tx.populationOperationalEvent.findMany({
        where: {
          organizationId: target.organizationId,
          startedAt: range,
          ...(target.clientId
            ? {
                program: {
                  rueFacilityProfile: {
                    building: { clientId: target.clientId },
                  },
                },
              }
            : {}),
          ...(target.buildingId
            ? {
                program: {
                  rueFacilityProfile: { buildingId: target.buildingId },
                },
              }
            : {}),
        },
        select: {
          id: true,
          startedAt: true,
          program: {
            select: { rueFacilityProfile: { select: { buildingId: true } } },
          },
        },
        orderBy: { id: 'asc' },
      });
      rows = found.map((x) => ({
        id: x.id,
        at: x.startedAt,
        buildingId: x.program.rueFacilityProfile.buildingId,
      }));
    } else if (definition.code === 'POPULATION_ALERTS_ACTIVATED') {
      const found = await tx.populationAlert.findMany({
        where: {
          activatedAt: range,
          program: {
            rueFacilityProfile: {
              building: {
                organizationId: target.organizationId,
                ...(target.clientId ? { clientId: target.clientId } : {}),
                ...(target.buildingId ? { id: target.buildingId } : {}),
              },
            },
          },
        },
        select: {
          id: true,
          activatedAt: true,
          program: {
            select: { rueFacilityProfile: { select: { buildingId: true } } },
          },
        },
        orderBy: { id: 'asc' },
      });
      rows = found.map((x) => ({
        id: x.id,
        at: x.activatedAt!,
        buildingId: x.program.rueFacilityProfile.buildingId,
      }));
    }
    const facts: NormalizedSourceFact[] = rows.map((row) => ({
      sourceType: definition.sourceDomain,
      opaqueIdentity: row.id,
      occurredAt: row.at.toISOString(),
    }));
    const quantity =
      definition.aggregation === 'DISTINCT_COUNT'
        ? new Set(rows.map((row) => row.buildingId)).size
        : rows.length;
    return {
      quantity: quantity.toString(),
      quality: definition.minimumSourceQuality,
      facts,
      summary: buildSourceSummary({
        sourceModels: [...new Set(facts.map((f) => f.sourceType))],
        contributingRows: rows.length.toString(),
        aggregation: definition.aggregation,
        ...(rows.length
          ? {
              earliestOccurredAt: rows
                .map((r) => r.at)
                .sort((a, b) => a.getTime() - b.getTime())[0]
                .toISOString(),
              latestOccurredAt: rows
                .map((r) => r.at)
                .sort((a, b) => b.getTime() - a.getTime())[0]
                .toISOString(),
            }
          : {}),
        warningCodes: [],
      }),
    };
  }

  private identities(
    definition: MetricDefinition,
    target: CalculationTarget,
    dto: CalculateMeteringDto,
    facts: NormalizedSourceFact[],
  ) {
    const fingerprint = sourceFingerprint({
      metricCode: definition.code,
      metricVersion: definition.metricVersion,
      policyVersion: definition.policyVersion,
      target,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      timezone: dto.timezone,
      facts,
    });
    return {
      sourceFingerprint: fingerprint,
      calculationKey: calculationKey({
        capabilityCode: definition.capabilityCode,
        metricCode: definition.code,
        metricVersion: definition.metricVersion,
        policyVersion: definition.policyVersion,
        target,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        timezone: dto.timezone,
        sourceFingerprint: fingerprint,
      }),
    };
  }
  private seriesWhere(
    definition: MetricDefinition,
    target: CalculationTarget,
    dto: CalculateMeteringDto,
  ): Prisma.MeteringResultWhereInput {
    return {
      organizationId: target.organizationId,
      clientId: target.clientId ?? null,
      buildingId: target.buildingId ?? null,
      scope: target.scope,
      capabilityCode: definition.capabilityCode,
      metricCode: definition.code,
      metricVersion: definition.metricVersion,
      policyVersion: definition.policyVersion,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      timezone: dto.timezone,
      unit: definition.unit,
    };
  }
  private current(
    tx: Tx,
    definition: MetricDefinition,
    target: CalculationTarget,
    dto: CalculateMeteringDto,
  ) {
    return tx.meteringResult.findFirst({
      where: {
        ...this.seriesWhere(definition, target, dto),
        supersededBy: null,
      },
    });
  }
  private async lockSeries(
    tx: Tx,
    definition: MetricDefinition,
    target: CalculationTarget,
    dto: CalculateMeteringDto,
  ) {
    const key = canonicalJson(this.seriesWhere(definition, target, dto));
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
  }
  private async insert(
    tx: Tx,
    definition: MetricDefinition,
    target: CalculationTarget,
    dto: CalculateMeteringDto,
    calculated: Awaited<ReturnType<MeteringService['calculateMetric']>>,
    identity: ReturnType<MeteringService['identities']>,
    actor: Actor,
    supersedesResultId?: string,
    correctionReason?: string,
  ) {
    const user = await tx.user.findUnique({
      where: { id: actor.userId },
      select: { firstName: true, lastName: true },
    });
    if (!user) throw new BadRequestException('Acteur introuvable.');
    return tx.meteringResult.create({
      data: {
        organizationId: target.organizationId,
        clientId: target.clientId,
        buildingId: target.buildingId,
        capabilityCode: definition.capabilityCode,
        scope: target.scope,
        metricCode: definition.code,
        metricVersion: definition.metricVersion,
        policyVersion: definition.policyVersion,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        timezone: dto.timezone,
        quantity: new Prisma.Decimal(calculated.quantity),
        unit: definition.unit,
        sourceQuality: calculated.quality,
        sourceCount: BigInt(calculated.facts.length),
        sourceFingerprint: identity.sourceFingerprint,
        sourceSummary: calculated.summary as unknown as Prisma.InputJsonValue,
        calculationKey: identity.calculationKey,
        supersedesResultId,
        correctionReason,
        createdByUserId: actor.userId,
        createdByDisplayName: `${user.firstName} ${user.lastName}`.trim(),
      },
    });
  }
  private assertIntegrity(
    result: MeteringResult,
    definition: MetricDefinition,
    target: CalculationTarget,
    dto: CalculateMeteringDto,
    calculated: Awaited<ReturnType<MeteringService['calculateMetric']>>,
    identity: ReturnType<MeteringService['identities']>,
  ) {
    const matches =
      result.calculationKey === identity.calculationKey &&
      result.organizationId === target.organizationId &&
      result.scope === target.scope &&
      result.clientId === (target.clientId ?? null) &&
      result.buildingId === (target.buildingId ?? null) &&
      result.capabilityCode === definition.capabilityCode &&
      result.metricCode === definition.code &&
      result.metricVersion === definition.metricVersion &&
      result.policyVersion === definition.policyVersion &&
      result.periodStart.getTime() === dto.periodStart.getTime() &&
      result.periodEnd.getTime() === dto.periodEnd.getTime() &&
      result.timezone === dto.timezone &&
      result.quantity.equals(new Prisma.Decimal(calculated.quantity)) &&
      result.unit === definition.unit &&
      result.sourceQuality === calculated.quality &&
      result.sourceCount === BigInt(calculated.facts.length) &&
      result.sourceFingerprint === identity.sourceFingerprint &&
      canonicalJson(result.sourceSummary) === canonicalJson(calculated.summary);
    if (!matches)
      throw new ConflictException({
        code: 'CALCULATION_INTEGRITY_CONFLICT',
        currentResultId: result.id,
      });
  }
  private async resolveCalculationKeyRace(
    definition: MetricDefinition,
    target: CalculationTarget,
    dto: CalculateMeteringDto,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.lockSeries(tx, definition, target, dto);
        const current = await this.current(tx, definition, target, dto);
        if (!current)
          throw new ConflictException({
            code: 'CALCULATION_INTEGRITY_CONFLICT',
          });
        const calculated = await this.calculateMetric(
          tx,
          definition,
          target,
          dto,
        );
        const identity = this.identities(
          definition,
          target,
          dto,
          calculated.facts,
        );
        if (current.sourceFingerprint !== identity.sourceFingerprint)
          throw new ConflictException({
            code: 'CALCULATION_INTEGRITY_CONFLICT',
            currentResultId: current.id,
          });
        this.assertIntegrity(
          current,
          definition,
          target,
          dto,
          calculated,
          identity,
        );
        return { created: false, result: this.serialize(current) };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
  private isUniqueConflict(error: unknown, field: string) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      JSON.stringify(error.meta?.target ?? '').includes(field)
    );
  }
  private serialize(result: MeteringResultWithStatus) {
    return {
      ...result,
      quantity: result.quantity.toString(),
      sourceCount:
        result.sourceCount === null || result.sourceCount === undefined
          ? null
          : result.sourceCount.toString(),
      calculatedAt: result.calculatedAt.toISOString(),
      createdAt: result.createdAt.toISOString(),
      periodStart: result.periodStart.toISOString(),
      periodEnd: result.periodEnd.toISOString(),
      status: result.supersededBy ? 'SUPERSEDED' : 'CURRENT',
      billingStatus: 'NOT_EVALUATED',
      enforcement: 'NONE',
    };
  }
  private auditSnapshot(result: MeteringResult): Prisma.InputJsonObject {
    return {
      resultId: result.id,
      organizationId: result.organizationId,
      scope: result.scope,
      clientId: result.clientId,
      buildingId: result.buildingId,
      capabilityCode: result.capabilityCode,
      metricCode: result.metricCode,
      metricVersion: result.metricVersion,
      policyVersion: result.policyVersion,
      periodStart: result.periodStart.toISOString(),
      periodEnd: result.periodEnd.toISOString(),
      timezone: result.timezone,
      quantity: result.quantity.toString(),
      unit: result.unit,
      sourceQuality: result.sourceQuality,
      sourceFingerprint: result.sourceFingerprint,
      supersedesResultId: result.supersedesResultId,
      correctionReason: result.correctionReason,
    };
  }
}
