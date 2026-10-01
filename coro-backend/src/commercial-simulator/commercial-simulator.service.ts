import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProposalPricingEngine } from '../commercial-proposals/proposal-pricing-engine';
import {
  CalculateScenarioDto,
  ConfigureScenarioDto,
  ConvertScenarioDto,
  ConfiguratorPriceBookQueryDto,
  ConfiguratorTargetQueryDto,
  CreateCostAssumptionSetDto,
  CreateGuidedWorkspaceDto,
  CreateCostAssumptionVersionDto,
  CreateScenarioDto,
  CreateValuationAssumptionSetDto,
  CreateValuationAssumptionVersionDto,
  CreateWorkspaceDto,
  SelectScenarioDto,
} from './commercial-simulator.dto';
import { simulatorFingerprint } from './calculation-identity';
import {
  resolveSimulatorDriver,
  SIMULATOR_DRIVER_REGISTRY,
} from './commercial-simulator.registry';
import {
  COMMERCIAL_FAMILY_REGISTRY,
  COMMERCIAL_FAMILY_REGISTRY_VERSION,
} from './commercial-family.registry';
import {
  calculateDirectCost,
  calculateRoleBasedDirectCost,
  costAtBillingCadence,
  deriveMargin,
} from './cost-engine';
import { calculateValueAnalysis } from '../commercial-proposals/proposal-value-analysis';
import {
  assertProfessionalServiceRole,
  professionalServiceRoleForComponent,
  roleCostScope,
} from './first-wave-commercial.registry';

type Actor = { userId: string };

const json = (value: unknown): Prisma.InputJsonValue => {
  const replaceBigInt = (_key: string, item: unknown): unknown =>
    typeof item === 'bigint' ? item.toString() : item;
  const parsed: unknown = JSON.parse(JSON.stringify(value, replaceBigInt));
  return parsed as Prisma.InputJsonValue;
};

@Injectable()
export class CommercialSimulatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: ProposalPricingEngine,
    private readonly audit: AdminAuditService,
  ) {}

  async configuratorBootstrap() {
    const [activeCatalogs, publishedCostVersions, publishedValueVersions] =
      await this.prisma.$transaction([
        this.prisma.priceBookVersion.count({
          where: { status: 'ACTIVE', priceBook: { archivedAt: null } },
        }),
        this.prisma.commercialCostAssumptionVersion.count({
          where: { status: 'PUBLISHED' },
        }),
        this.prisma.commercialValuationAssumptionVersion.count({
          where: { status: 'PUBLISHED' },
        }),
      ]);
    return {
      registryVersion: COMMERCIAL_FAMILY_REGISTRY_VERSION,
      families: COMMERCIAL_FAMILY_REGISTRY,
      drivers: SIMULATOR_DRIVER_REGISTRY,
      supportedTargetTypes: ['ORGANIZATION', 'PROSPECT'],
      currencies: ['CAD'],
      readiness: {
        catalog: activeCatalogs ? 'READY' : 'SETUP_REQUIRED',
        cost: publishedCostVersions ? 'AVAILABLE' : 'NOT_CONFIGURED',
        value: publishedValueVersions ? 'AVAILABLE' : 'NOT_CONFIGURED',
      },
      boundaries: {
        priceAuthority: 'PriceBookVersion',
        scenarioAuthority: 'CommercialSimulationWorkspace',
        productionReadyClaim: false,
      },
    };
  }

  async configuratorOrganizations(query: ConfiguratorTargetQueryDto) {
    const where: Prisma.OrganizationWhereInput = {
      isInternal: false,
      OR: [
        { commercialRelationship: null },
        { commercialRelationship: { not: 'INTERNAL' } },
      ],
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({
        where,
        select: {
          id: true,
          name: true,
          isActive: true,
          commercialRelationship: true,
          sector: true,
        },
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      page: query.page,
      pageSize: query.pageSize,
      total,
      items: rows.map((row) => ({
        id: row.id,
        type: 'ORGANIZATION' as const,
        displayName: row.name,
        secondaryLabel: row.sector,
        status: row.isActive ? 'ACTIVE' : 'SUSPENDED',
        selectable: row.isActive,
        commercialRelationship: row.commercialRelationship,
      })),
    };
  }

  async configuratorProspects(query: ConfiguratorTargetQueryDto) {
    const where: Prisma.CommercialProspectWhereInput = query.search
      ? {
          OR: [
            { displayName: { contains: query.search, mode: 'insensitive' } },
            { legalName: { contains: query.search, mode: 'insensitive' } },
            { reference: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.commercialProspect.count({ where }),
      this.prisma.commercialProspect.findMany({
        where,
        select: {
          id: true,
          reference: true,
          legalName: true,
          displayName: true,
          status: true,
          convertedOrganizationId: true,
          preferredLanguage: true,
        },
        orderBy: { displayName: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      page: query.page,
      pageSize: query.pageSize,
      total,
      items: rows.map((row) => ({
        id: row.id,
        type: 'PROSPECT' as const,
        displayName: row.displayName,
        secondaryLabel: `${row.legalName} · ${row.reference}`,
        status: row.status,
        selectable: row.status === 'ACTIVE',
        convertedOrganizationId: row.convertedOrganizationId,
        preferredLanguage: row.preferredLanguage,
      })),
    };
  }

  async configuratorPriceBooks(query: ConfiguratorPriceBookQueryDto) {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();
    let audience = query.audience;
    if (query.targetType === 'ORGANIZATION') {
      const target = await this.prisma.organization.findUnique({
        where: { id: query.targetId },
        select: {
          isActive: true,
          isInternal: true,
          commercialRelationship: true,
        },
      });
      if (
        !target ||
        !target.isActive ||
        target.isInternal ||
        target.commercialRelationship === 'INTERNAL'
      )
        throw new BadRequestException('CONFIGURATOR_TARGET_NOT_SELECTABLE');
      if (target.commercialRelationship)
        audience = target.commercialRelationship;
    } else {
      const target = await this.prisma.commercialProspect.findUnique({
        where: { id: query.targetId },
        select: { status: true },
      });
      if (!target || target.status !== 'ACTIVE')
        throw new BadRequestException('CONFIGURATOR_TARGET_NOT_SELECTABLE');
    }
    if (!audience)
      throw new BadRequestException('CONFIGURATOR_AUDIENCE_REQUIRED');

    const [versions, overdueScheduled] = await this.prisma.$transaction([
      this.prisma.priceBookVersion.findMany({
        where: {
          status: 'ACTIVE',
          effectiveFrom: { lte: asOf },
          OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: asOf } }],
          priceBook: { archivedAt: null, audience, currency: query.currency },
        },
        include: { priceBook: true },
        orderBy: { versionNumber: 'desc' },
      }),
      this.prisma.priceBookVersion.count({
        where: {
          status: 'SCHEDULED',
          effectiveFrom: { lte: asOf },
          priceBook: { archivedAt: null, audience, currency: query.currency },
        },
      }),
    ]);
    const candidates = versions.map((version) => ({
      priceBookId: version.priceBookId,
      priceBookVersionId: version.id,
      label: `${version.priceBook.name} · ${audience} · ${query.currency} · v${version.versionNumber} · ACTIVE · ${version.effectiveFrom?.toISOString().slice(0, 10) ?? 'no effective date'}`,
      audience,
      currency: query.currency,
      versionNumber: version.versionNumber,
      status: version.status,
      effectiveFrom: version.effectiveFrom,
      effectiveUntil: version.effectiveUntil,
      selectable: true,
    }));
    return {
      audience,
      currency: query.currency,
      readiness: candidates.length ? 'READY' : 'SETUP_REQUIRED',
      code: candidates.length ? null : 'COMMERCIAL_CATALOG_SETUP_REQUIRED',
      requiresSelection: candidates.length > 1,
      warnings: overdueScheduled
        ? ['SCHEDULED_PRICEBOOK_EFFECTIVE_DATE_PASSED']
        : [],
      candidates,
    };
  }

  async createGuidedWorkspace(dto: CreateGuidedWorkspaceDto, actor: Actor) {
    const targetType = dto.organizationId ? 'ORGANIZATION' : 'PROSPECT';
    const targetId = dto.organizationId ?? dto.prospectId;
    if (!targetId)
      throw new BadRequestException(
        'Exactly one organization or prospect target is required.',
      );
    const options = await this.configuratorPriceBooks({
      targetType,
      targetId,
      audience: dto.audience,
      currency: 'CAD',
    });
    if (
      !options.candidates.some(
        (candidate) => candidate.priceBookVersionId === dto.priceBookVersionId,
      )
    )
      throw new BadRequestException('CONFIGURATOR_PRICEBOOK_NOT_ELIGIBLE');
    const workspaceDto: CreateWorkspaceDto = {
      title: dto.title,
      description: dto.description,
      organizationId: dto.organizationId,
      prospectId: dto.prospectId,
      priceBookVersionId: dto.priceBookVersionId,
    };
    return this.createWorkspace(workspaceDto, actor);
  }

  listCostAssumptions() {
    return this.prisma.commercialCostAssumptionSet.findMany({
      include: {
        versions: {
          include: { values: true },
          orderBy: { versionNumber: 'desc' },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  createCostAssumptionSet(dto: CreateCostAssumptionSetDto) {
    return this.prisma.commercialCostAssumptionSet.create({ data: dto });
  }

  async createCostAssumptionVersion(
    setId: string,
    dto: CreateCostAssumptionVersionDto,
    actor: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${setId}, 0))`;
      const latest = await tx.commercialCostAssumptionVersion.aggregate({
        where: { setId },
        _max: { versionNumber: true },
      });
      return tx.commercialCostAssumptionVersion.create({
        data: {
          setId,
          versionNumber: (latest._max.versionNumber ?? 0) + 1,
          currency: dto.currency,
          methodologyCode: dto.methodologyCode,
          methodologyVersion: dto.methodologyVersion,
          createdByUserId: actor.userId,
          values: {
            create: dto.values.map((value) => this.assumptionValue(value)),
          },
        },
        include: { values: true },
      });
    });
  }

  listValuationAssumptions() {
    return this.prisma.commercialValuationAssumptionSet.findMany({
      include: {
        versions: {
          include: { values: true },
          orderBy: { versionNumber: 'desc' },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  createValuationAssumptionSet(dto: CreateValuationAssumptionSetDto) {
    return this.prisma.commercialValuationAssumptionSet.create({ data: dto });
  }

  async createValuationAssumptionVersion(
    setId: string,
    dto: CreateValuationAssumptionVersionDto,
    actor: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${setId}, 0))`;
      const latest = await tx.commercialValuationAssumptionVersion.aggregate({
        where: { setId },
        _max: { versionNumber: true },
      });
      return tx.commercialValuationAssumptionVersion.create({
        data: {
          setId,
          versionNumber: (latest._max.versionNumber ?? 0) + 1,
          methodologyVersion: dto.methodologyVersion,
          createdByUserId: actor.userId,
          values: {
            create: dto.values.map((value) => this.assumptionValue(value)),
          },
        },
        include: { values: true },
      });
    });
  }

  async transitionAssumption(
    kind: 'cost' | 'valuation',
    versionId: string,
    transition: 'publish' | 'archive',
    reason: string,
    actor: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const current =
        kind === 'cost'
          ? await tx.commercialCostAssumptionVersion.findUnique({
              where: { id: versionId },
            })
          : await tx.commercialValuationAssumptionVersion.findUnique({
              where: { id: versionId },
            });
      if (!current)
        throw new NotFoundException('Assumption version introuvable.');
      const expected = transition === 'publish' ? 'DRAFT' : 'PUBLISHED';
      if (current.status !== expected)
        throw new ConflictException('ASSUMPTION_LIFECYCLE_INVALID');
      const content =
        kind === 'cost'
          ? await tx.commercialCostAssumptionVersion.findUniqueOrThrow({
              where: { id: versionId },
              include: {
                values: {
                  orderBy: [{ assumptionCode: 'asc' }, { scopeKey: 'asc' }],
                },
              },
            })
          : await tx.commercialValuationAssumptionVersion.findUniqueOrThrow({
              where: { id: versionId },
              include: {
                values: {
                  orderBy: [{ assumptionCode: 'asc' }, { scopeKey: 'asc' }],
                },
              },
            });
      const contentHash = simulatorFingerprint(
        content.values.map((value) => ({
          ...value,
          id: undefined,
          versionId: undefined,
          createdAt: undefined,
          updatedAt: undefined,
        })),
      );
      const data =
        transition === 'publish'
          ? { status: 'PUBLISHED' as const, publishedAt: now, contentHash }
          : { status: 'ARCHIVED' as const, archivedAt: now };
      const updated =
        kind === 'cost'
          ? await tx.commercialCostAssumptionVersion.update({
              where: { id: versionId },
              data,
            })
          : await tx.commercialValuationAssumptionVersion.update({
              where: { id: versionId },
              data,
            });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: `COMMERCIAL_${kind.toUpperCase()}_ASSUMPTION_${transition === 'publish' ? 'PUBLISHED' : 'ARCHIVED'}`,
        targetType:
          kind === 'cost'
            ? 'CommercialCostAssumptionVersion'
            : 'CommercialValuationAssumptionVersion',
        targetId: versionId,
        reason: this.audit.normalizeReason(reason, true),
        afterData: { status: updated.status, contentHash: updated.contentHash },
      });
      return updated;
    });
  }

  private assumptionValue(value: {
    assumptionCode: string;
    assumptionVersion: string;
    scopeKey?: string;
    valueType: 'DECIMAL' | 'INTEGER' | 'MONEY' | 'BOOLEAN' | 'TEXT';
    decimalValue?: string;
    integerValue?: string;
    moneyMinorValue?: string;
    booleanValue?: boolean;
    textValue?: string;
    currency?: string;
    unit?: string;
  }) {
    return {
      ...value,
      scopeKey: value.scopeKey ?? 'GLOBAL',
      decimalValue:
        value.decimalValue == null
          ? undefined
          : new Prisma.Decimal(value.decimalValue),
      integerValue:
        value.integerValue == null ? undefined : BigInt(value.integerValue),
      moneyMinorValue:
        value.moneyMinorValue == null
          ? undefined
          : BigInt(value.moneyMinorValue),
    };
  }

  listWorkspaces() {
    return this.prisma.commercialSimulationWorkspace.findMany({
      include: { organization: true, prospect: true, selectedScenario: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getWorkspace(id: string) {
    const workspace =
      await this.prisma.commercialSimulationWorkspace.findUnique({
        where: { id },
        include: {
          organization: true,
          prospect: true,
          priceBookVersion: { include: { priceBook: true } },
          scenarios: {
            include: {
              capabilities: { include: { capability: true } },
              lines: { include: { costEfforts: true } },
              driverValues: true,
              runs: {
                orderBy: { calculatedAt: 'desc' },
                take: 1,
                include: {
                  priceResult: true,
                  costResult: true,
                  valueResults: { include: { metrics: true } },
                },
              },
            },
            orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
          },
        },
      });
    if (!workspace)
      throw new NotFoundException('Simulation workspace introuvable.');
    return workspace;
  }

  async createWorkspace(dto: CreateWorkspaceDto, actor: Actor) {
    if (Boolean(dto.organizationId) === Boolean(dto.prospectId))
      throw new BadRequestException(
        'Exactly one organization or prospect target is required.',
      );
    return this.prisma.$transaction(async (tx) => {
      const priceBookVersion = await tx.priceBookVersion.findUnique({
        where: { id: dto.priceBookVersionId },
        include: { priceBook: true },
      });
      if (!priceBookVersion)
        throw new BadRequestException('PriceBookVersion introuvable.');
      const workspace = await tx.commercialSimulationWorkspace.create({
        data: {
          reference: `SIM-${randomUUID().slice(0, 8).toUpperCase()}`,
          title: dto.title,
          description: dto.description,
          organizationId: dto.organizationId,
          prospectId: dto.prospectId,
          priceBookVersionId: dto.priceBookVersionId,
          currency: priceBookVersion.priceBook.currency,
          createdByUserId: actor.userId,
        },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'COMMERCIAL_SIMULATION_WORKSPACE_CREATED',
        targetType: 'CommercialSimulationWorkspace',
        targetId: workspace.id,
        organizationId: dto.organizationId,
        afterData: {
          reference: workspace.reference,
          priceBookVersionId: workspace.priceBookVersionId,
        },
      });
      return workspace;
    });
  }

  async createScenario(workspaceId: string, dto: CreateScenarioDto) {
    await this.getWorkspace(workspaceId);
    return this.prisma.commercialSimulationScenario.create({
      data: { workspaceId, ...dto },
    });
  }

  async configureScenario(
    workspaceId: string,
    scenarioId: string,
    dto: ConfigureScenarioDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.commercialSimulationScenario.updateMany({
        where: {
          id: scenarioId,
          workspaceId,
          lockVersion: dto.lockVersion,
          status: 'ACTIVE',
        },
        data: { lockVersion: { increment: 1 } },
      });
      if (updated.count !== 1)
        throw new ConflictException('Scenario changed or unavailable.');
      for (const driver of dto.driverValues)
        resolveSimulatorDriver(driver.driverCode, driver.driverVersion);
      await tx.commercialSimulationDriverValue.deleteMany({
        where: { scenarioId },
      });
      if (dto.driverValues.length)
        await tx.commercialSimulationDriverValue.createMany({
          data: dto.driverValues.map((driver) => ({
            ...driver,
            scenarioId,
            scopeKey: driver.scopeKey ?? 'GLOBAL',
            integerValue:
              driver.integerValue == null
                ? undefined
                : BigInt(driver.integerValue),
            moneyMinorValue:
              driver.moneyMinorValue == null
                ? undefined
                : BigInt(driver.moneyMinorValue),
            decimalValue:
              driver.decimalValue == null
                ? undefined
                : new Prisma.Decimal(driver.decimalValue),
          })),
        });
      if (dto.capabilityIds) {
        await tx.commercialSimulationScenarioCapability.deleteMany({
          where: { scenarioId },
        });
        if (dto.capabilityIds.length)
          await tx.commercialSimulationScenarioCapability.createMany({
            data: dto.capabilityIds.map((capabilityId, displayOrder) => ({
              scenarioId,
              capabilityId,
              displayOrder,
            })),
          });
      }
      if (dto.lines) {
        await tx.commercialSimulationScenarioLine.deleteMany({
          where: { scenarioId },
        });
        for (const [index, line] of dto.lines.entries()) {
          if (
            line.pricingModel === 'PER_UNIT' &&
            (line.metric !== 'HOUR' ||
              line.quantityUnit !== 'HOUR' ||
              line.commercialQuantityBasis !== 'DECLARED')
          )
            throw new BadRequestException(
              'PER_UNIT_HOUR_REQUIRES_DECLARED_HOUR_QUANTITY',
            );
          const deterministicRole = professionalServiceRoleForComponent(
            line.componentCode,
          );
          if (deterministicRole && line.costEfforts?.length)
            throw new BadRequestException(
              'HOURLY_ROLE_EFFORT_MUST_USE_DECLARED_QUANTITY',
            );
          const roles = new Set<string>();
          for (const effort of line.costEfforts ?? []) {
            assertProfessionalServiceRole(effort.roleCode);
            if (roles.has(effort.roleCode))
              throw new BadRequestException('DUPLICATE_ROLE_EFFORT');
            roles.add(effort.roleCode);
          }
          const { costEfforts, ...lineData } = line;
          await tx.commercialSimulationScenarioLine.create({
            data: {
              ...lineData,
              scenarioId,
              quantity:
                line.quantity == null
                  ? undefined
                  : new Prisma.Decimal(line.quantity),
              proposedUnitAmountMinor:
                line.proposedUnitAmountMinor == null
                  ? undefined
                  : BigInt(line.proposedUnitAmountMinor),
              distributionLimit:
                line.distributionLimit == null
                  ? undefined
                  : new Prisma.Decimal(line.distributionLimit),
              displayOrder: line.displayOrder ?? index,
              costEfforts: costEfforts?.length
                ? {
                    create: costEfforts.map((effort) => ({
                      roleCode: effort.roleCode,
                      hours: new Prisma.Decimal(effort.hours),
                      source: effort.source,
                      justification: effort.justification,
                    })),
                  }
                : undefined,
            },
          });
        }
      }
      return tx.commercialSimulationScenario.findUniqueOrThrow({
        where: { id: scenarioId },
        include: {
          capabilities: true,
          lines: { include: { costEfforts: true } },
          driverValues: true,
        },
      });
    });
  }

  async selectScenario(
    workspaceId: string,
    dto: SelectScenarioDto,
    actor: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const scenario = await tx.commercialSimulationScenario.findFirst({
        where: { id: dto.scenarioId, workspaceId, status: 'ACTIVE' },
      });
      if (!scenario)
        throw new BadRequestException('Scenario does not belong to workspace.');
      const changed = await tx.commercialSimulationWorkspace.updateMany({
        where: {
          id: workspaceId,
          lockVersion: dto.lockVersion,
          status: 'ACTIVE',
        },
        data: {
          selectedScenarioId: scenario.id,
          lockVersion: { increment: 1 },
        },
      });
      if (changed.count !== 1)
        throw new ConflictException('Workspace changed or unavailable.');
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'COMMERCIAL_SIMULATION_SCENARIO_SELECTED',
        targetType: 'CommercialSimulationScenario',
        targetId: scenario.id,
        afterData: { workspaceId },
      });
      return scenario;
    });
  }

  async compare(workspaceId: string) {
    const workspace =
      await this.prisma.commercialSimulationWorkspace.findUnique({
        where: { id: workspaceId },
        include: {
          scenarios: {
            where: { status: 'ACTIVE' },
            orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
            include: {
              lines: {
                include: { costEfforts: true },
                orderBy: { displayOrder: 'asc' },
              },
              runs: {
                orderBy: { calculatedAt: 'desc' },
                take: 1,
                include: {
                  priceResult: true,
                  costResult: true,
                  valueResults: { include: { metrics: true } },
                },
              },
            },
          },
        },
      });
    if (!workspace)
      throw new NotFoundException('Simulation workspace introuvable.');
    return workspace.scenarios.map((scenario) => {
      const run = scenario.runs[0] ?? null;
      const margin =
        run?.priceResult && run.costResult && run.costStatus === 'COMPLETE'
          ? deriveMargin(
              run.priceResult.firstYearCommitmentMinor.toString(),
              run.costResult.firstYearCostMinor.toString(),
            )
          : null;
      return {
        scenarioId: scenario.id,
        name: scenario.name,
        selected: workspace.selectedScenarioId === scenario.id,
        stale: run ? run.scenarioLockVersion !== scenario.lockVersion : null,
        configuration: scenario.lines,
        run,
        margin,
      };
    });
  }

  async calculate(
    workspaceId: string,
    scenarioId: string,
    dto: CalculateScenarioDto,
    actor: Actor,
  ) {
    const scenario = await this.prisma.commercialSimulationScenario.findFirst({
      where: { id: scenarioId, workspaceId, status: 'ACTIVE' },
      include: {
        workspace: {
          include: {
            priceBookVersion: {
              include: { components: { include: { tiers: true } } },
            },
          },
        },
        lines: {
          include: { capability: true, costEfforts: true },
          orderBy: { displayOrder: 'asc' },
        },
        capabilities: { include: { capability: true } },
        driverValues: { orderBy: [{ driverCode: 'asc' }, { scopeKey: 'asc' }] },
      },
    });
    if (!scenario) throw new NotFoundException('Scenario introuvable.');
    if (scenario.workspace.currency !== 'CAD')
      throw new BadRequestException('Simulator V1 supports CAD only.');
    const componentById = new Map(
      scenario.workspace.priceBookVersion.components.map((component) => [
        component.id,
        component,
      ]),
    );
    const requestLines = scenario.lines.map((line) => {
      const component = line.priceComponentId
        ? componentById.get(line.priceComponentId)
        : undefined;
      return {
        code: line.componentCode,
        pricingModel: line.pricingModel,
        chargeType: line.chargeType,
        billingPeriod: line.billingPeriod,
        metric: line.metric,
        quantity: line.quantity?.toString(),
        quantityUnit: line.quantityUnit,
        amountMinor:
          line.proposedUnitAmountMinor?.toString() ??
          component?.amountMinor?.toString(),
        tierMode: line.tierMode,
        tiers: component?.tiers.map((tier) => ({
          minimumQuantity: tier.minimumQuantity.toString(),
          maximumQuantity: tier.maximumQuantity?.toString(),
          amountMinor: tier.amountMinor.toString(),
        })),
        requestedStatus:
          line.proposedUnitAmountMinor != null
            ? ('MANUAL' as const)
            : undefined,
        justification: line.justification,
      };
    });
    const costVersion = dto.costAssumptionVersionId
      ? await this.prisma.commercialCostAssumptionVersion.findUnique({
          where: { id: dto.costAssumptionVersionId },
          include: { values: true },
        })
      : null;
    if (
      dto.costAssumptionVersionId &&
      (!costVersion || costVersion.status !== 'PUBLISHED')
    )
      throw new BadRequestException('COST_ASSUMPTION_VERSION_INVALID');
    if (costVersion && costVersion.currency !== scenario.workspace.currency)
      throw new BadRequestException('COST_ASSUMPTION_CURRENCY_MISMATCH');
    if (
      costVersion &&
      (costVersion.methodologyCode !== 'direct-cost' ||
        !['v1', 'v2'].includes(costVersion.methodologyVersion))
    )
      throw new BadRequestException('COST_ASSUMPTION_METHODOLOGY_INVALID');
    const valuationVersions = dto.valuationAssumptionVersionIds?.length
      ? await this.prisma.commercialValuationAssumptionVersion.findMany({
          where: { id: { in: dto.valuationAssumptionVersionIds } },
          include: { set: true },
        })
      : [];
    if (
      valuationVersions.length !==
        new Set(dto.valuationAssumptionVersionIds ?? []).size ||
      valuationVersions.some((version) => version.status !== 'PUBLISHED')
    )
      throw new BadRequestException('VALUATION_ASSUMPTION_VERSION_INVALID');
    const complianceValuationAuthority = valuationVersions.find(
      (version) =>
        version.set.methodologyCode === 'proposal-value' &&
        version.methodologyVersion === 'v1',
    );
    const costValueByLine = new Map(
      (costVersion?.values ?? [])
        .filter(
          (value) =>
            value.assumptionCode === 'LINE_UNIT_COST_MINOR' &&
            value.valueType === 'MONEY' &&
            value.moneyMinorValue !== null &&
            value.currency === scenario.workspace.currency,
        )
        .map((value) => [value.scopeKey, value.moneyMinorValue!.toString()]),
    );
    const roleCostByScope = new Map(
      (costVersion?.values ?? [])
        .filter(
          (value) =>
            value.assumptionCode === 'LOADED_DIRECT_DELIVERY_COST' &&
            value.valueType === 'MONEY' &&
            value.moneyMinorValue !== null &&
            value.currency === scenario.workspace.currency,
        )
        .map((value) => [
          value.scopeKey,
          {
            amountMinor: value.moneyMinorValue!.toString(),
            assumptionCode: value.assumptionCode,
            assumptionVersion: value.assumptionVersion,
            scopeKey: value.scopeKey,
          },
        ]),
    );
    const lineCosts = scenario.lines.map((line) => {
      const unitCostMinor = costValueByLine.get(line.componentCode);
      const deterministicRole = professionalServiceRoleForComponent(
        line.componentCode,
      );
      const efforts = deterministicRole
        ? line.quantity
          ? [
              {
                roleCode: deterministicRole,
                hours: line.quantity.toString(),
              },
            ]
          : []
        : line.costEfforts.map((effort) => ({
            roleCode: effort.roleCode,
            hours: effort.hours.toString(),
          }));
      if (efforts.length && unitCostMinor)
        throw new BadRequestException('AMBIGUOUS_COST_AUTHORITY');
      if (efforts.length) {
        if (costVersion?.methodologyVersion !== 'v2') return null;
        const resolved = efforts.map((effort) => {
          const roleCode = effort.roleCode;
          assertProfessionalServiceRole(roleCode);
          const authority = roleCostByScope.get(roleCostScope(roleCode));
          return authority
            ? { roleCode, hours: effort.hours, authority }
            : null;
        });
        if (resolved.some((item) => item === null)) return null;
        const calculation = calculateRoleBasedDirectCost(
          resolved.map((item) => ({
            roleCode: item!.roleCode,
            hours: item!.hours,
            roleCostMinor: item!.authority.amountMinor,
            chargeType: line.chargeType,
            billingPeriod: line.billingPeriod ?? undefined,
          })),
        );
        const totalMinor = costAtBillingCadence(
          calculation,
          line.chargeType,
          line.billingPeriod ?? undefined,
        );
        return {
          totalMinor,
          chargeType: line.chargeType,
          billingPeriod: line.billingPeriod ?? undefined,
          roleBreakdown: calculation.breakdown.map((item, index) => ({
            roleCode: item.roleCode,
            hours: item.hours,
            roleCostMinor: item.roleCostMinor,
            calculatedCostMinor: item.calculatedCostMinor,
            ...resolved[index]!.authority,
          })),
        };
      }
      const quantity =
        line.quantity?.toString() ??
        (line.pricingModel === 'FLAT' ? '1.000000' : null);
      if (!unitCostMinor || !quantity) return null;
      const calculation = calculateDirectCost([
        {
          quantity,
          unitCostMinor,
          chargeType: line.chargeType,
          billingPeriod: line.billingPeriod ?? undefined,
        },
      ]);
      const totalMinor = costAtBillingCadence(
        calculation,
        line.chargeType,
        line.billingPeriod ?? undefined,
      );
      return {
        totalMinor,
        chargeType: line.chargeType,
        billingPeriod: line.billingPeriod ?? undefined,
        roleBreakdown: [],
      };
    });
    const completeCost =
      costVersion &&
      lineCosts.length > 0 &&
      lineCosts.every((line) => line !== null)
        ? calculateDirectCost(
            lineCosts.map((line) => ({
              quantity: '1',
              unitCostMinor: line.totalMinor,
              chargeType: line.chargeType,
              billingPeriod: line.billingPeriod,
            })),
          )
        : null;
    const inputByCode = new Map(
      scenario.driverValues.map((value) => [value.driverCode, value]),
    );
    const mandates = inputByCode
      .get('MANDATES_PER_YEAR')
      ?.decimalValue?.toString();
    const hours = inputByCode
      .get('AVG_HOURS_PER_MANDATE')
      ?.decimalValue?.toString();
    const billable = inputByCode
      .get('BILLABLE_RATE')
      ?.moneyMinorValue?.toString();
    const gainRaw = inputByCode
      .get('PRODUCTIVITY_GAIN')
      ?.decimalValue?.toString();
    const gain =
      gainRaw && /^\d+(?:\.0+)?$/.test(gainRaw)
        ? Number(gainRaw.split('.')[0])
        : null;
    const hasCompliance = scenario.capabilities.some(
      (item) => item.capability.code === 'COMPLIANCE_OPERATIONS',
    );
    const complianceValue =
      complianceValuationAuthority &&
      mandates &&
      hours &&
      billable &&
      gain !== null
        ? calculateValueAnalysis({
            mandatesPerYear: mandates,
            averageHoursPerMandate: hours,
            billableRateMinorPerHour: billable,
            productivityGainBasisPoints: gain,
          })
        : null;
    const evidence = {
      fingerprintVersion: 'simulator-input/v1',
      priceBookVersionId: scenario.workspace.priceBookVersionId,
      currency: scenario.workspace.currency,
      pricingMethodology: 'proposal-pricing/v1',
      costAssumptionVersionId: dto.costAssumptionVersionId ?? null,
      valuationAssumptionVersionIds: [
        ...(dto.valuationAssumptionVersionIds ?? []),
      ].sort(),
      lines: requestLines,
      costEfforts: scenario.lines.map((line) => ({
        componentCode: line.componentCode,
        deterministicRole: professionalServiceRoleForComponent(
          line.componentCode,
        ),
        efforts: line.costEfforts
          .map((effort) => ({
            roleCode: effort.roleCode,
            hours: effort.hours.toString(),
            source: effort.source,
            justification: effort.justification,
          }))
          .sort((a, b) => a.roleCode.localeCompare(b.roleCode)),
      })),
      inputs: scenario.driverValues.map((value) => ({
        ...value,
        id: undefined,
        scenarioId: undefined,
        createdAt: undefined,
        updatedAt: undefined,
      })),
    };
    const calculationKey = simulatorFingerprint(evidence);
    const existing =
      await this.prisma.commercialSimulationCalculationRun.findUnique({
        where: { scenarioId_calculationKey: { scenarioId, calculationKey } },
        include: { priceResult: true, lines: true, inputs: true },
      });
    if (existing) return existing;
    const priced = this.pricing.calculate({
      currency: 'CAD',
      calculationVersion: 'proposal-pricing/v1',
      lines: requestLines,
    });
    if (priced.totals.firstYearCommitmentMinor === null)
      throw new BadRequestException('Scenario pricing is incomplete.');
    const firstYearCommitmentMinor = priced.totals.firstYearCommitmentMinor;
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${scenarioId + calculationKey}, 0))`;
        const retry = await tx.commercialSimulationCalculationRun.findUnique({
          where: { scenarioId_calculationKey: { scenarioId, calculationKey } },
          include: { priceResult: true, lines: true, inputs: true },
        });
        if (retry) return retry;
        const latest = await tx.commercialSimulationCalculationRun.aggregate({
          where: { scenarioId },
          _max: { sequence: true },
        });
        return tx.commercialSimulationCalculationRun.create({
          data: {
            scenarioId,
            workspaceId,
            priceBookVersionId: scenario.workspace.priceBookVersionId,
            costAssumptionVersionId: dto.costAssumptionVersionId,
            sequence: (latest._max.sequence ?? 0) + 1,
            calculationKey,
            fingerprintVersion: 'simulator-input/v1',
            inputFingerprint: calculationKey,
            workspaceLockVersion: scenario.workspace.lockVersion,
            scenarioLockVersion: scenario.lockVersion,
            currency: 'CAD',
            pricingMethodologyCode: 'proposal-pricing',
            pricingMethodologyVersion: 'v1',
            costMethodologyCode: costVersion?.methodologyCode ?? null,
            costMethodologyVersion: costVersion?.methodologyVersion ?? null,
            priceStatus: 'COMPLETE',
            costStatus: completeCost ? 'COMPLETE' : 'UNAVAILABLE',
            valueStatus: complianceValue
              ? 'COMPLETE'
              : hasCompliance
                ? 'UNAVAILABLE'
                : 'NOT_APPLICABLE',
            createdByUserId: actor.userId,
            valuationVersions: {
              create: valuationVersions.map((version) => ({
                valuationAssumptionVersionId: version.id,
              })),
            },
            inputs: {
              create: scenario.driverValues.map((value) => ({
                driverCode: value.driverCode,
                driverVersion: value.driverVersion,
                scopeKey: value.scopeKey,
                valueType: value.valueType,
                source: value.source,
                decimalValue: value.decimalValue,
                integerValue: value.integerValue,
                moneyMinorValue: value.moneyMinorValue,
                booleanValue: value.booleanValue,
                textValue: value.textValue,
                currency: value.currency,
                unit: value.unit,
                labelFr: value.driverCode,
                labelEn: value.driverCode,
                justification: value.justification,
              })),
            },
            lines: {
              create: priced.lines.map((result, index) => {
                const source = scenario.lines[index];
                return {
                  componentCode: source.componentCode,
                  capabilityCode: source.capability?.code ?? null,
                  priceComponentId: source.priceComponentId,
                  componentNameFr: source.componentNameFr,
                  pricingModel: source.pricingModel,
                  chargeType: source.chargeType,
                  billingPeriod: source.billingPeriod,
                  metric: source.metric,
                  quantity: source.quantity,
                  quantityUnit: source.quantityUnit,
                  catalogUnitAmountMinor:
                    result.catalogUnitAmountMinor == null
                      ? null
                      : BigInt(result.catalogUnitAmountMinor),
                  proposedUnitAmountMinor:
                    result.proposedUnitAmountMinor == null
                      ? null
                      : BigInt(result.proposedUnitAmountMinor),
                  catalogExtendedAmountMinor:
                    result.catalogExtendedAmountMinor == null
                      ? null
                      : BigInt(result.catalogExtendedAmountMinor),
                  proposedExtendedAmountMinor:
                    result.proposedExtendedAmountMinor == null
                      ? null
                      : BigInt(result.proposedExtendedAmountMinor),
                  estimatedCostMinor: lineCosts[index]
                    ? BigInt(lineCosts[index].totalMinor)
                    : null,
                  calculationStatus: result.status,
                  calculationExplanationFr: result.explanation,
                  internalUse: source.internalUse,
                  distributable: source.distributable,
                  distributionLimit: source.distributionLimit,
                  distributionMetric: source.distributionMetric,
                  commercialQuantityBasis: source.commercialQuantityBasis,
                  commercialRuleCode: source.commercialRuleCode,
                  commercialRuleVersion: source.commercialRuleVersion,
                  displayOrder: source.displayOrder,
                  costEfforts: lineCosts[index]?.roleBreakdown.length
                    ? {
                        create: lineCosts[index].roleBreakdown.map(
                          (effort) => ({
                            roleCode: effort.roleCode,
                            hours: new Prisma.Decimal(effort.hours),
                            roleCostMinor: BigInt(effort.roleCostMinor),
                            calculatedCostMinor: BigInt(
                              effort.calculatedCostMinor,
                            ),
                            assumptionCode: effort.assumptionCode,
                            assumptionVersion: effort.assumptionVersion,
                            scopeKey: effort.scopeKey,
                          }),
                        ),
                      }
                    : undefined,
                };
              }),
            },
            priceResult: {
              create: {
                currency: 'CAD',
                oneTimeTotalMinor: BigInt(
                  priced.totals.oneTimeTotalMinor ?? '0',
                ),
                recurringMonthlyCadenceMinor: BigInt(
                  priced.totals.recurringMonthlyCadenceMinor ?? '0',
                ),
                recurringAnnualCadenceMinor: BigInt(
                  priced.totals.recurringAnnualCadenceMinor ?? '0',
                ),
                monthlyRecurringEquivalentMinor: BigInt(
                  priced.totals.monthlyRecurringEquivalentMinor ?? '0',
                ),
                annualRecurringEquivalentMinor: BigInt(
                  priced.totals.annualRecurringEquivalentMinor ?? '0',
                ),
                estimatedUsageTotalMinor: BigInt(
                  priced.totals.estimatedUsageTotalMinor ?? '0',
                ),
                firstYearCommitmentMinor: BigInt(firstYearCommitmentMinor),
                firstYearIncludesEstimate:
                  priced.totals.firstYearIncludesEstimate,
              },
            },
            costResult: completeCost
              ? {
                  create: {
                    currency: scenario.workspace.currency,
                    oneTimeDirectCostMinor: BigInt(
                      completeCost.oneTimeDirectCostMinor,
                    ),
                    recurringMonthlyCostMinor: BigInt(
                      completeCost.recurringMonthlyCostMinor,
                    ),
                    recurringAnnualCostMinor: BigInt(
                      completeCost.recurringAnnualCostMinor,
                    ),
                    variableEstimatedCostMinor: 0n,
                    firstYearCostMinor: BigInt(completeCost.firstYearCostMinor),
                  },
                }
              : undefined,
            valueResults: complianceValue
              ? {
                  create: [
                    {
                      capabilityCode: 'COMPLIANCE_OPERATIONS',
                      methodologyCode: 'proposal-value',
                      methodologyVersion: 'v1',
                      status: 'COMPLETE',
                      metrics: {
                        create: [
                          {
                            metricCode: 'ESTIMATED_HOURS_SAVED',
                            metricVersion: 'v1',
                            valueType: 'DECIMAL',
                            decimalValue: new Prisma.Decimal(
                              complianceValue.estimatedHoursSaved,
                            ),
                            unit: 'HOUR',
                            customerVisible: true,
                          },
                          {
                            metricCode: 'ESTIMATED_CAPACITY_VALUE_MINOR',
                            metricVersion: 'v1',
                            valueType: 'MONEY',
                            moneyMinorValue: BigInt(
                              complianceValue.estimatedCapacityValueMinor,
                            ),
                            currency: scenario.workspace.currency,
                            customerVisible: true,
                          },
                        ],
                      },
                    },
                  ],
                }
              : undefined,
          },
          include: { priceResult: true, lines: true, inputs: true },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        return this.prisma.commercialSimulationCalculationRun.findUniqueOrThrow(
          {
            where: {
              scenarioId_calculationKey: { scenarioId, calculationKey },
            },
            include: { priceResult: true, lines: true, inputs: true },
          },
        );
      throw error;
    }
  }

  async convert(
    workspaceId: string,
    scenarioId: string,
    runId: string,
    dto: ConvertScenarioDto,
    actor: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${runId}, 0))`;
      const prior = await tx.commercialSimulationProposalConversion.findUnique({
        where: { calculationRunId: runId },
        include: { proposal: true, proposalRevision: true },
      });
      if (prior) return prior;
      const run = await tx.commercialSimulationCalculationRun.findFirst({
        where: { id: runId, scenarioId, workspaceId },
        include: {
          scenario: {
            include: {
              workspace: {
                include: {
                  priceBookVersion: {
                    include: {
                      priceBook: true,
                      components: { include: { tiers: true } },
                    },
                  },
                },
              },
            },
          },
          lines: { orderBy: { displayOrder: 'asc' } },
          inputs: { orderBy: [{ driverCode: 'asc' }, { scopeKey: 'asc' }] },
          priceResult: true,
          valueResults: { include: { metrics: true } },
        },
      });
      if (
        !run ||
        !run.priceResult ||
        run.scenario.workspace.selectedScenarioId !== scenarioId
      )
        throw new BadRequestException(
          'Only the selected scenario current run can be converted.',
        );
      if (run.scenario.lockVersion !== run.scenarioLockVersion)
        throw new BadRequestException('SIMULATOR_RUN_STALE');
      const componentById = new Map(
        run.scenario.workspace.priceBookVersion.components.map((component) => [
          component.id,
          component,
        ]),
      );
      const recomputed = this.pricing.calculate({
        currency: 'CAD',
        calculationVersion:
          run.pricingMethodologyCode + '/' + run.pricingMethodologyVersion,
        lines: run.lines.map((line) => {
          const component = line.priceComponentId
            ? componentById.get(line.priceComponentId)
            : undefined;
          return {
            code: line.componentCode,
            pricingModel: line.pricingModel,
            chargeType: line.chargeType,
            billingPeriod: line.billingPeriod,
            metric: line.metric,
            quantity: line.quantity?.toString(),
            quantityUnit: line.quantityUnit,
            amountMinor:
              line.proposedUnitAmountMinor?.toString() ??
              component?.amountMinor?.toString(),
            tierMode: component?.tierMode,
            tiers: component?.tiers.map((tier) => ({
              minimumQuantity: tier.minimumQuantity.toString(),
              maximumQuantity: tier.maximumQuantity?.toString(),
              amountMinor: tier.amountMinor.toString(),
            })),
            requestedStatus: line.calculationStatus,
          };
        }),
      });
      const expected = run.priceResult;
      const actualTotals = [
        recomputed.totals.oneTimeTotalMinor,
        recomputed.totals.recurringMonthlyCadenceMinor,
        recomputed.totals.recurringAnnualCadenceMinor,
        recomputed.totals.monthlyRecurringEquivalentMinor,
        recomputed.totals.annualRecurringEquivalentMinor,
        recomputed.totals.estimatedUsageTotalMinor,
        recomputed.totals.firstYearCommitmentMinor,
      ].map((value) => value ?? '0');
      const expectedTotals = [
        expected.oneTimeTotalMinor,
        expected.recurringMonthlyCadenceMinor,
        expected.recurringAnnualCadenceMinor,
        expected.monthlyRecurringEquivalentMinor,
        expected.annualRecurringEquivalentMinor,
        expected.estimatedUsageTotalMinor,
        expected.firstYearCommitmentMinor,
      ].map(String);
      if (actualTotals.some((value, index) => value !== expectedTotals[index]))
        throw new ConflictException('SIMULATOR_PROPOSAL_PRICE_MISMATCH');
      const inputByCode = new Map(
        run.inputs.map((input) => [input.driverCode, input]),
      );
      const mandates = inputByCode
        .get('MANDATES_PER_YEAR')
        ?.decimalValue?.toString();
      const hours = inputByCode
        .get('AVG_HOURS_PER_MANDATE')
        ?.decimalValue?.toString();
      const billable = inputByCode
        .get('BILLABLE_RATE')
        ?.moneyMinorValue?.toString();
      const gainRaw = inputByCode
        .get('PRODUCTIVITY_GAIN')
        ?.decimalValue?.toString();
      const gain =
        gainRaw && /^\d+(?:\.0+)?$/.test(gainRaw)
          ? Number(gainRaw.split('.')[0])
          : null;
      const runValue = run.valueResults.find(
        (value) =>
          value.capabilityCode === 'COMPLIANCE_OPERATIONS' &&
          value.methodologyCode === 'proposal-value' &&
          value.methodologyVersion === 'v1' &&
          value.status === 'COMPLETE',
      );
      let proposalValue: ReturnType<typeof calculateValueAnalysis> | undefined;
      if (runValue) {
        if (!mandates || !hours || !billable || gain === null)
          throw new ConflictException(
            'SIMULATOR_PROPOSAL_VALUE_INPUT_MISMATCH',
          );
        if (!dto.valueDisclaimerFr?.trim())
          throw new BadRequestException('VALUE_DISCLAIMER_FR_REQUIRED');
        proposalValue = calculateValueAnalysis({
          mandatesPerYear: mandates,
          averageHoursPerMandate: hours,
          billableRateMinorPerHour: billable,
          productivityGainBasisPoints: gain,
        });
        const hoursMetric = runValue.metrics.find(
          (metric) => metric.metricCode === 'ESTIMATED_HOURS_SAVED',
        );
        const capacityMetric = runValue.metrics.find(
          (metric) => metric.metricCode === 'ESTIMATED_CAPACITY_VALUE_MINOR',
        );
        if (
          hoursMetric?.decimalValue?.toString() !==
            proposalValue.estimatedHoursSaved ||
          capacityMetric?.moneyMinorValue?.toString() !==
            proposalValue.estimatedCapacityValueMinor
        )
          throw new ConflictException('SIMULATOR_PROPOSAL_VALUE_MISMATCH');
      }
      const capabilityIds = new Map(
        (
          await tx.commercialCapability.findMany({
            where: {
              code: {
                in: run.lines
                  .map((line) => line.capabilityCode)
                  .filter(
                    (code): code is NonNullable<typeof code> => code !== null,
                  ),
              },
            },
            select: { id: true, code: true },
          })
        ).map((capability) => [capability.code, capability.id]),
      );
      const user = await tx.user.findUniqueOrThrow({
        where: { id: actor.userId },
        select: { firstName: true, lastName: true },
      });
      const actorName = `${user.firstName} ${user.lastName}`.trim();
      const proposal = await tx.commercialProposal.create({
        data: {
          reference: `PROP-${randomUUID().slice(0, 8).toUpperCase()}`,
          title: dto.title,
          organizationId: run.scenario.workspace.organizationId,
          prospectId: run.scenario.workspace.prospectId,
          createdByUserId: actor.userId,
          createdByDisplayName: actorName,
        },
      });
      const priceBook = run.scenario.workspace.priceBookVersion.priceBook;
      const revision = await tx.commercialProposalRevision.create({
        data: {
          proposalId: proposal.id,
          revisionNumber: 1,
          sourcePriceBookId: priceBook.id,
          sourcePriceBookVersionId: run.priceBookVersionId,
          priceBookCodeSnapshot: priceBook.code,
          priceBookNameSnapshot: priceBook.name,
          priceBookVersionSnapshot:
            run.scenario.workspace.priceBookVersion.versionNumber,
          audienceSnapshot: priceBook.audience,
          relationshipSnapshot: dto.relationship,
          currency: run.currency,
          recipientLegalName: dto.recipientLegalName,
          recipientDisplayName: dto.recipientDisplayName,
          recipientContactName: dto.recipientContactName,
          recipientEmail: dto.recipientEmail,
          recipientCountry: dto.recipientCountry,
          recipientPreferredLanguage: dto.preferredLanguage,
          oneTimeTotalMinor: expected.oneTimeTotalMinor,
          recurringMonthlyCadenceMinor: expected.recurringMonthlyCadenceMinor,
          recurringAnnualCadenceMinor: expected.recurringAnnualCadenceMinor,
          monthlyRecurringEquivalentMinor:
            expected.monthlyRecurringEquivalentMinor,
          annualRecurringEquivalentMinor:
            expected.annualRecurringEquivalentMinor,
          estimatedUsageTotalMinor: expected.estimatedUsageTotalMinor,
          firstYearCommitmentMinor: expected.firstYearCommitmentMinor,
          firstYearIncludesEstimate: expected.firstYearIncludesEstimate,
          calculationVersion: 'proposal-pricing/v1',
          calculatedAt: new Date(),
          createdByUserId: actor.userId,
          createdByDisplayName: actorName,
          inputs: {
            create: run.inputs
              .filter(
                (input) =>
                  input.driverCode !== 'PRODUCTIVITY_GAIN' || proposalValue,
              )
              .map((input, displayOrder) => ({
                code: input.driverCode,
                category: resolveSimulatorDriver(
                  input.driverCode,
                  input.driverVersion,
                ).category,
                valueType: input.valueType,
                decimalValue: input.decimalValue,
                integerValue: input.integerValue,
                moneyMinor: input.moneyMinorValue,
                booleanValue: input.booleanValue,
                textValue: input.textValue,
                currency: input.currency,
                unit: input.unit,
                source:
                  input.source === 'INTERNAL_ASSUMPTION'
                    ? 'MANUAL_ASSUMPTION'
                    : 'DECLARED',
                labelFR: input.labelFr,
                labelEN: input.labelEn,
                justification: input.justification,
                displayOrder,
              })),
          },
          lines: {
            create: run.lines.map((line) => ({
              source: line.priceComponentId
                ? 'CATALOG_COMPONENT'
                : 'CUSTOM_COMPONENT',
              sourcePriceComponentId: line.priceComponentId,
              capabilityId: line.capabilityCode
                ? capabilityIds.get(line.capabilityCode)
                : undefined,
              componentCode: line.componentCode,
              componentNameFR: line.componentNameFr,
              pricingModel: line.pricingModel,
              chargeType: line.chargeType,
              billingPeriod: line.billingPeriod,
              metric: line.metric,
              quantity: line.quantity,
              quantityUnit: line.quantityUnit,
              catalogUnitAmountMinor: line.catalogUnitAmountMinor,
              proposedUnitAmountMinor: line.proposedUnitAmountMinor,
              catalogExtendedAmountMinor: line.catalogExtendedAmountMinor,
              proposedExtendedAmountMinor: line.proposedExtendedAmountMinor,
              calculationStatus: line.calculationStatus,
              calculationExplanationFR: line.calculationExplanationFr,
              internalUse: line.internalUse,
              distributable: line.distributable,
              distributionLimit: line.distributionLimit,
              distributionMetric: line.distributionMetric,
              commercialQuantityBasis: line.commercialQuantityBasis,
              commercialRuleCode: line.commercialRuleCode,
              commercialRuleVersion: line.commercialRuleVersion,
              displayOrder: line.displayOrder,
            })),
          },
          valueAnalysis: proposalValue
            ? {
                create: {
                  mandatesPerYear: new Prisma.Decimal(mandates!),
                  averageHoursPerMandate: new Prisma.Decimal(hours!),
                  currentBillableRateMinorPerHour: BigInt(billable!),
                  estimatedProductivityGainBasisPoints: gain!,
                  estimatedHoursSaved: new Prisma.Decimal(
                    proposalValue.estimatedHoursSaved,
                  ),
                  estimatedCapacityValueMinor: BigInt(
                    proposalValue.estimatedCapacityValueMinor,
                  ),
                  methodologyVersion: proposalValue.methodologyVersion,
                  roundingPolicy: proposalValue.roundingPolicy,
                  disclaimerFR: dto.valueDisclaimerFr!.trim(),
                  disclaimerEN: dto.valueDisclaimerEn?.trim(),
                },
              }
            : undefined,
        },
      });
      const conversion = await tx.commercialSimulationProposalConversion.create(
        {
          data: {
            workspaceId,
            scenarioId,
            calculationRunId: runId,
            proposalId: proposal.id,
            proposalRevisionId: revision.id,
            convertedByUserId: actor.userId,
          },
          include: { proposal: true, proposalRevision: true },
        },
      );
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'COMMERCIAL_SIMULATION_CONVERTED_TO_PROPOSAL',
        targetType: 'CommercialSimulationProposalConversion',
        targetId: conversion.id,
        organizationId: run.scenario.workspace.organizationId,
        afterData: json({
          workspaceId,
          scenarioId,
          calculationRunId: runId,
          proposalId: proposal.id,
          proposalRevisionId: revision.id,
        }),
      });
      return conversion;
    });
  }
}
