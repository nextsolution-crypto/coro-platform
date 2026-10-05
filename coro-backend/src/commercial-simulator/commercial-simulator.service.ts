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
  GuidedConfigureScenarioDto,
  CreateGuidedWorkspaceDto,
  CreateCostAssumptionVersionDto,
  CreateScenarioDto,
  CreateValuationAssumptionSetDto,
  CreateValuationAssumptionVersionDto,
  CreateWorkspaceDto,
  SelectScenarioDto,
  ScenarioMutationDto,
  UpdateScenarioMetadataDto,
  UpdateAssumptionVersionDto,
} from './commercial-simulator.dto';
import {
  SIMULATOR_FINGERPRINT_VERSION,
  canonicalCapabilityCodes,
  simulatorFingerprint,
} from './calculation-identity';
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
import { buildFamilyReadiness } from './commercial-readiness';
import {
  COMMERCIAL_PACKAGING_POLICY,
  COMMERCIAL_PACKAGING_POLICY_VERSION,
} from './commercial-packaging.registry';
import {
  packagingDraftBlockingIssues,
  validatePackagingSelection,
} from './commercial-packaging';
import {
  assertCustomerSafeProjection,
  customerCadence,
  customerLineGroup,
  customerQuantityLabel,
  customerSafeInputs,
} from '../commercial-proposals/customer-safe-commercial-projection';
import {
  assessCostMethodologyCompatibility,
  costMethodologyDefinitions,
} from './cost-methodology.registry';
import {
  CALCULATION_RUN_RESPONSE_INCLUDE,
  PROPOSAL_CONVERSION_RESPONSE_INCLUDE,
  calculationRunResponse,
  proposalConversionResponse,
} from './commercial-simulator-response';

type Actor = { userId: string };

const json = (value: unknown): Prisma.InputJsonValue => {
  const replaceBigInt = (_key: string, item: unknown): unknown =>
    typeof item === 'bigint' ? item.toString() : item;
  const parsed: unknown = JSON.parse(JSON.stringify(value, replaceBigInt));
  return parsed as Prisma.InputJsonValue;
};

const cadToMinor = (value: string) => {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value))
    throw new BadRequestException('INVALID_CAD_AMOUNT');
  const [whole, fraction = ''] = value.split('.');
  return (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))).toString();
};

const minorToCad = (value: bigint | null) => {
  if (value == null) return null;
  const whole = value / 100n;
  const fraction = (value % 100n).toString().padStart(2, '0');
  return `${whole}.${fraction}`;
};

@Injectable()
export class CommercialSimulatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: ProposalPricingEngine,
    private readonly audit: AdminAuditService,
  ) {}

  async configuratorBootstrap() {
    const [
      activeCatalogs,
      incompleteCatalogs,
      publishedCostVersions,
      publishedValueVersions,
    ] = await this.prisma.$transaction([
      this.prisma.priceBookVersion.count({
        where: { status: 'ACTIVE', priceBook: { archivedAt: null } },
      }),
      this.prisma.priceBookVersion.count({
        where: {
          status: 'ACTIVE',
          priceBook: { archivedAt: null },
          components: { some: { revenueCategory: null } },
        },
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
        semanticClassification: !activeCatalogs
          ? 'UNKNOWN'
          : incompleteCatalogs
            ? 'INCOMPLETE'
            : 'COMPLETE',
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
        include: {
          priceBook: true,
          components: { select: { revenueCategory: true } },
        },
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
    const classifiedVersions = versions.filter((version) =>
      version.components.every((component) => component.revenueCategory),
    );
    const candidates = classifiedVersions.map((version) => ({
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
      warnings: [
        ...(overdueScheduled
          ? ['SCHEDULED_PRICEBOOK_EFFECTIVE_DATE_PASSED']
          : []),
        ...(classifiedVersions.length !== versions.length
          ? ['REVENUE_CLASSIFICATION_INCOMPLETE']
          : []),
      ],
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

  costAssumptionDefinitions() {
    return costMethodologyDefinitions();
  }

  createCostAssumptionSet(dto: CreateCostAssumptionSetDto, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.commercialCostAssumptionSet.create({ data: dto });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'COMMERCIAL_COST_ASSUMPTION_SET_CREATED',
        targetType: 'CommercialCostAssumptionSet',
        targetId: row.id,
        targetLabel: row.code,
        afterData: row,
      });
      return row;
    });
  }

  async createCostAssumptionVersion(
    setId: string,
    dto: CreateCostAssumptionVersionDto,
    actor: Actor,
  ) {
    this.validateAssumptionValues(
      'cost',
      dto.values,
      dto.methodologyCode,
      dto.methodologyVersion,
    );
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${setId}, 0))`;
      const latest = await tx.commercialCostAssumptionVersion.aggregate({
        where: { setId },
        _max: { versionNumber: true },
      });
      const row = await tx.commercialCostAssumptionVersion.create({
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
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'COMMERCIAL_COST_ASSUMPTION_VERSION_CREATED',
        targetType: 'CommercialCostAssumptionVersion',
        targetId: row.id,
        afterData: { setId, versionNumber: row.versionNumber },
      });
      return row;
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

  createValuationAssumptionSet(
    dto: CreateValuationAssumptionSetDto,
    actor: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.commercialValuationAssumptionSet.create({
        data: dto,
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'COMMERCIAL_VALUATION_ASSUMPTION_SET_CREATED',
        targetType: 'CommercialValuationAssumptionSet',
        targetId: row.id,
        targetLabel: row.code,
        afterData: row,
      });
      return row;
    });
  }

  async createValuationAssumptionVersion(
    setId: string,
    dto: CreateValuationAssumptionVersionDto,
    actor: Actor,
  ) {
    this.validateAssumptionValues('valuation', dto.values);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${setId}, 0))`;
      const latest = await tx.commercialValuationAssumptionVersion.aggregate({
        where: { setId },
        _max: { versionNumber: true },
      });
      const row = await tx.commercialValuationAssumptionVersion.create({
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
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'COMMERCIAL_VALUATION_ASSUMPTION_VERSION_CREATED',
        targetType: 'CommercialValuationAssumptionVersion',
        targetId: row.id,
        afterData: { setId, versionNumber: row.versionNumber },
      });
      return row;
    });
  }

  async updateAssumptionVersion(
    kind: 'cost' | 'valuation',
    versionId: string,
    dto: UpdateAssumptionVersionDto,
    actor: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current =
        kind === 'cost'
          ? await tx.commercialCostAssumptionVersion.findUnique({
              where: { id: versionId },
              include: { values: true },
            })
          : await tx.commercialValuationAssumptionVersion.findUnique({
              where: { id: versionId },
              include: { values: true },
            });
      if (!current)
        throw new NotFoundException('Assumption version introuvable.');
      if (current.status !== 'DRAFT')
        throw new ConflictException('ASSUMPTION_VERSION_IMMUTABLE');
      this.validateAssumptionValues(
        kind,
        dto.values,
        kind === 'cost' && 'methodologyCode' in current
          ? String(current.methodologyCode)
          : undefined,
        current.methodologyVersion,
      );
      if (kind === 'cost') {
        await tx.commercialCostAssumptionValue.deleteMany({
          where: { versionId },
        });
        await tx.commercialCostAssumptionValue.createMany({
          data: dto.values.map((value) => ({
            versionId,
            ...this.assumptionValue(value),
          })),
        });
      } else {
        await tx.commercialValuationAssumptionValue.deleteMany({
          where: { versionId },
        });
        await tx.commercialValuationAssumptionValue.createMany({
          data: dto.values.map((value) => ({
            versionId,
            ...this.assumptionValue(value),
          })),
        });
      }
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: `COMMERCIAL_${kind.toUpperCase()}_ASSUMPTION_DRAFT_UPDATED`,
        targetType:
          kind === 'cost'
            ? 'CommercialCostAssumptionVersion'
            : 'CommercialValuationAssumptionVersion',
        targetId: versionId,
        reason: this.audit.normalizeReason(dto.reason, true),
        beforeData: { valueCount: current.values.length },
        afterData: { valueCount: dto.values.length },
      });
      return kind === 'cost'
        ? tx.commercialCostAssumptionVersion.findUniqueOrThrow({
            where: { id: versionId },
            include: { values: true },
          })
        : tx.commercialValuationAssumptionVersion.findUniqueOrThrow({
            where: { id: versionId },
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
      if (transition === 'publish' && content.values.length === 0)
        throw new BadRequestException('ASSUMPTION_VALUES_REQUIRED');
      if (transition === 'publish' && kind === 'cost') {
        if (!('methodologyCode' in content))
          throw new BadRequestException('COST_ASSUMPTION_METHODOLOGY_INVALID');
        const compatibility = assessCostMethodologyCompatibility({
          methodologyCode: String(content.methodologyCode),
          methodologyVersion: content.methodologyVersion,
          values: content.values,
        });
        if (!compatibility.compatible)
          throw new BadRequestException({
            code: 'COST_ASSUMPTION_METHODOLOGY_INCOMPATIBLE',
            issues: compatibility.issues,
          });
      }
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

  private validateAssumptionValues(
    kind: 'cost' | 'valuation',
    values: Array<{
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
    }>,
    methodologyCode?: string,
    methodologyVersion?: string,
  ) {
    const allowed = new Map([['PRODUCTIVITY_GAIN', 'DECIMAL']]);
    const identities = new Set<string>();
    for (const value of values) {
      const scope = value.scopeKey ?? 'GLOBAL';
      const identity = `${value.assumptionCode}/${scope}`;
      if (identities.has(identity))
        throw new BadRequestException('ASSUMPTION_VALUE_DUPLICATE');
      identities.add(identity);
      if (
        kind === 'valuation' &&
        (allowed.get(value.assumptionCode) !== value.valueType ||
          value.assumptionVersion !== 'v1')
      )
        throw new BadRequestException('ASSUMPTION_DEFINITION_INVALID');
      if (
        kind === 'valuation' &&
        scope !== 'GLOBAL' &&
        !scope.startsWith('COMPONENT:')
      )
        throw new BadRequestException('ASSUMPTION_SCOPE_INVALID');
      const populated = [
        value.decimalValue,
        value.integerValue,
        value.moneyMinorValue,
        value.booleanValue,
        value.textValue,
      ].filter((item) => item !== undefined).length;
      if (populated !== 1)
        throw new BadRequestException('ASSUMPTION_TYPED_VALUE_INVALID');
      if (value.valueType === 'MONEY' && value.currency !== 'CAD')
        throw new BadRequestException('ASSUMPTION_CURRENCY_INVALID');
    }
    if (kind === 'cost') {
      const compatibility = assessCostMethodologyCompatibility({
        methodologyCode: methodologyCode ?? '',
        methodologyVersion: methodologyVersion ?? '',
        values: values.map((value) => ({
          ...value,
          scopeKey: value.scopeKey ?? 'GLOBAL',
        })),
      });
      if (!compatibility.compatible)
        throw new BadRequestException({
          code: 'COST_ASSUMPTION_METHODOLOGY_INCOMPATIBLE',
          issues: compatibility.issues,
        });
    }
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

  async getGuidedWorkspace(id: string) {
    const workspace = await this.getWorkspace(id);
    return {
      id: workspace.id,
      reference: workspace.reference,
      title: workspace.title,
      description: workspace.description,
      status: workspace.status,
      lockVersion: workspace.lockVersion,
      currency: workspace.currency,
      selectedScenarioId: workspace.selectedScenarioId,
      target: workspace.organization
        ? { type: 'ORGANIZATION', name: workspace.organization.name }
        : { type: 'PROSPECT', name: workspace.prospect?.displayName ?? '' },
      catalog: {
        name: workspace.priceBookVersion.priceBook.name,
        audience: workspace.priceBookVersion.priceBook.audience,
        versionNumber: workspace.priceBookVersion.versionNumber,
        status: workspace.priceBookVersion.status,
      },
      scenarios: workspace.scenarios.map((scenario) => {
        const latestRun = scenario.runs[0] ?? null;
        const contribution =
          latestRun?.priceResult &&
          latestRun.costResult &&
          latestRun.costStatus === 'COMPLETE'
            ? deriveMargin(
                latestRun.priceResult.firstYearCommitmentMinor.toString(),
                latestRun.costResult.firstYearCostMinor.toString(),
              )
            : null;
        const familyCodes = COMMERCIAL_FAMILY_REGISTRY.filter(
          (family) =>
            family.code !== 'PROFESSIONAL' &&
            family.capabilityCodes.some((code) =>
              scenario.capabilities.some(
                (selection) => selection.capability.code === code,
              ),
            ),
        ).map((family) => family.code);
        if (
          scenario.lines.some((line) =>
            line.componentCode.startsWith('CORO_PROFESSIONAL_'),
          )
        )
          familyCodes.push('PROFESSIONAL');
        if (
          scenario.lines.some(
            (line) => line.revenueCategory === 'PROFESSIONAL_SERVICE',
          ) &&
          !familyCodes.includes('PROFESSIONAL_SERVICES')
        )
          familyCodes.push('PROFESSIONAL_SERVICES');
        const packaging = validatePackagingSelection({
          familyCodes,
          components: scenario.lines
            .filter((line) => line.source === 'CATALOG_COMPONENT')
            .map((line) => ({
              componentCode: line.componentCode,
              revenueCategory: line.revenueCategory,
            })),
        });
        return {
          id: scenario.id,
          name: scenario.name,
          description: scenario.description,
          status: scenario.status,
          displayOrder: scenario.displayOrder,
          lockVersion: scenario.lockVersion,
          selected: workspace.selectedScenarioId === scenario.id,
          familyCodes,
          packaging,
          capabilityCodes: scenario.capabilities.map(
            (selection) => selection.capability.code,
          ),
          lines: scenario.lines.map((line) => ({
            id: line.id,
            source: line.source,
            priceComponentId: line.priceComponentId,
            name: line.componentNameFr,
            pricingModel: line.pricingModel,
            chargeType: line.chargeType,
            revenueCategory: line.revenueCategory,
            billingPeriod: line.billingPeriod,
            metric: line.metric,
            quantity: line.quantity?.toString() ?? null,
            quantityUnit: line.quantityUnit,
            commercialQuantityBasis: line.commercialQuantityBasis,
            proposedUnitAmountCad: minorToCad(line.proposedUnitAmountMinor),
            justification: line.justification,
            displayOrder: line.displayOrder,
            costEfforts: line.costEfforts.map((effort) => ({
              role: effort.roleCode,
              hours: effort.hours.toString(),
              justification: effort.justification,
            })),
          })),
          drivers: scenario.driverValues.map((driver) => ({
            code: driver.driverCode,
            value:
              driver.decimalValue?.toString() ??
              driver.integerValue?.toString() ??
              minorToCad(driver.moneyMinorValue) ??
              (driver.booleanValue == null
                ? driver.textValue
                : String(driver.booleanValue)),
            justification: driver.justification,
          })),
          stale: latestRun
            ? latestRun.scenarioLockVersion !== scenario.lockVersion
            : null,
          latestResult: latestRun
            ? {
                id: latestRun.id,
                calculatedAt: latestRun.calculatedAt,
                priceStatus: latestRun.priceStatus,
                costStatus: latestRun.costStatus,
                valueStatus: latestRun.valueStatus,
                warningCodes: latestRun.warningCodes,
                firstYearCommitmentCad: minorToCad(
                  latestRun.priceResult?.firstYearCommitmentMinor ?? null,
                ),
                firstYearCostCad: minorToCad(
                  latestRun.costResult?.firstYearCostMinor ?? null,
                ),
                contributionCad: contribution
                  ? minorToCad(BigInt(contribution.contributionMinor))
                  : null,
                marginPercent:
                  contribution?.marginBasisPoints == null
                    ? null
                    : (contribution.marginBasisPoints / 100).toFixed(2),
              }
            : null,
        };
      }),
    };
  }

  async guidedCatalog(workspaceId: string) {
    const workspace =
      await this.prisma.commercialSimulationWorkspace.findUnique({
        where: { id: workspaceId },
        select: {
          currency: true,
          priceBookVersion: {
            select: {
              id: true,
              status: true,
              components: {
                include: {
                  capability: true,
                  tiers: { orderBy: { displayOrder: 'asc' } },
                },
                orderBy: { displayOrder: 'asc' },
              },
            },
          },
        },
      });
    if (!workspace)
      throw new NotFoundException('Simulation workspace introuvable.');
    const [costVersions, publishedValuationCount] =
      await this.prisma.$transaction([
        this.prisma.commercialCostAssumptionVersion.findMany({
          where: {
            status: 'PUBLISHED',
            methodologyCode: 'direct-cost',
            methodologyVersion: { in: ['v1', 'v2'] },
          },
          select: {
            id: true,
            versionNumber: true,
            methodologyCode: true,
            methodologyVersion: true,
            publishedAt: true,
            set: { select: { name: true, code: true } },
            values: {
              select: {
                assumptionCode: true,
                assumptionVersion: true,
                scopeKey: true,
                valueType: true,
                currency: true,
              },
            },
          },
        }),
        this.prisma.commercialValuationAssumptionVersion.findMany({
          where: {
            status: 'PUBLISHED',
            methodologyVersion: 'v1',
            set: { methodologyCode: 'proposal-value' },
          },
          select: {
            id: true,
            versionNumber: true,
            methodologyVersion: true,
            publishedAt: true,
            set: { select: { name: true, code: true, methodologyCode: true } },
          },
        }),
      ]);
    const costCompatibility = costVersions.map((version) => ({
      version,
      result: assessCostMethodologyCompatibility({
        methodologyCode: version.methodologyCode,
        methodologyVersion: version.methodologyVersion,
        values: version.values,
      }),
    }));
    const compatibleCostVersions = costCompatibility
      .filter((item) => item.result.compatible)
      .map((item) => item.version);
    const incompatibleCostAuthorities = costCompatibility.filter(
      (item) => !item.result.compatible,
    );
    const components = workspace.priceBookVersion.components.map(
      (component) => ({
        code: component.code,
        capabilityCode: component.capability.code,
        pricingModel: component.pricingModel,
        revenueCategory: component.revenueCategory,
        amountConfigured: component.amountMinor !== null,
        tierCount: component.tiers.length,
      }),
    );
    return {
      currency: workspace.currency,
      priceBookVersionStatus: workspace.priceBookVersion.status,
      components: workspace.priceBookVersion.components.map((component) => ({
        id: component.id,
        code: component.code,
        labelFr: component.nameFr,
        labelEn: component.nameEn,
        descriptionFr: component.descriptionFr,
        capabilityCode: component.capability.code,
        revenueCategory: component.revenueCategory,
        chargeType: component.chargeType,
        billingPeriod: component.billingPeriod,
        pricingModel: component.pricingModel,
        metric: component.metric,
        unit: component.metric,
        catalogAmountCad: minorToCad(component.amountMinor),
        tiers: component.tiers.map((tier) => ({
          minimumQuantity: tier.minimumQuantity.toString(),
          maximumQuantity: tier.maximumQuantity?.toString() ?? null,
          amountCad: minorToCad(tier.amountMinor),
        })),
        displayOrder: component.displayOrder,
        selectable: Boolean(component.revenueCategory),
        packaging: COMMERCIAL_PACKAGING_POLICY.flatMap((policy) =>
          policy.components
            .filter((rule) => rule.componentCode === component.code)
            .map((rule) => ({
              familyCode: policy.familyCode,
              role: rule.role,
              dependencies: rule.dependencies,
              exclusions: rule.exclusions,
              professionalServiceAttachments:
                rule.professionalServiceAttachments,
            })),
        ),
      })),
      packagingPolicy: {
        version: COMMERCIAL_PACKAGING_POLICY_VERSION,
        families: COMMERCIAL_PACKAGING_POLICY,
      },
      readiness: buildFamilyReadiness({
        families: COMMERCIAL_FAMILY_REGISTRY,
        components,
        publishedCostScopes: [
          ...new Set(
            compatibleCostVersions.flatMap((version) =>
              version.values.map((value) => value.scopeKey),
            ),
          ),
        ],
        incompatibleCostAuthorities: incompatibleCostAuthorities.length,
        publishedValuationCount: publishedValuationCount.length,
      }),
      assumptions: {
        cost: compatibleCostVersions.map((version) => ({
          id: version.id,
          label: `${version.set.name} · v${version.versionNumber} · ${version.methodologyCode}/${version.methodologyVersion}`,
          publishedAt: version.publishedAt,
        })),
        costCompatibilityWarnings: incompatibleCostAuthorities.map(
          ({ version }) => ({
            id: version.id,
            message: `Published cost assumption version is incompatible with ${version.methodologyCode}/${version.methodologyVersion}.`,
          }),
        ),
        valuation: publishedValuationCount.map((version) => ({
          id: version.id,
          label: `${version.set.name} · v${version.versionNumber} · ${version.set.methodologyCode}/${version.methodologyVersion}`,
          publishedAt: version.publishedAt,
        })),
      },
    };
  }

  async updateScenarioMetadata(
    workspaceId: string,
    scenarioId: string,
    dto: UpdateScenarioMetadataDto,
    actor: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.commercialSimulationScenario.updateMany({
        where: {
          id: scenarioId,
          workspaceId,
          status: 'ACTIVE',
          lockVersion: dto.lockVersion,
        },
        data: {
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          lockVersion: { increment: 1 },
        },
      });
      if (changed.count !== 1)
        throw new ConflictException('Scenario changed or unavailable.');
      const scenario = await tx.commercialSimulationScenario.findUniqueOrThrow({
        where: { id: scenarioId },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'COMMERCIAL_SIMULATION_SCENARIO_METADATA_UPDATED',
        targetType: 'CommercialSimulationScenario',
        targetId: scenarioId,
        afterData: { workspaceId, name: scenario.name },
      });
      return scenario;
    });
  }

  async duplicateScenario(
    workspaceId: string,
    scenarioId: string,
    actor: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${workspaceId}, 0))`;
      const source = await tx.commercialSimulationScenario.findFirst({
        where: { id: scenarioId, workspaceId },
        include: {
          capabilities: true,
          lines: { include: { costEfforts: true } },
          driverValues: true,
        },
      });
      if (!source) throw new NotFoundException('Scenario introuvable.');
      const siblings = await tx.commercialSimulationScenario.count({
        where: { workspaceId, name: { startsWith: `${source.name} — Copy` } },
      });
      const name = `${source.name} — Copy${siblings ? ` ${siblings + 1}` : ''}`;
      const duplicate = await tx.commercialSimulationScenario.create({
        data: {
          workspaceId,
          name,
          description: source.description,
          displayOrder: source.displayOrder + 1,
          capabilities: {
            create: source.capabilities.map((item) => ({
              capabilityId: item.capabilityId,
              displayOrder: item.displayOrder,
            })),
          },
          driverValues: {
            create: source.driverValues.map((value) => ({
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
              justification: value.justification,
            })),
          },
          lines: {
            create: source.lines.map((line) => ({
              capabilityId: line.capabilityId,
              priceComponentId: line.priceComponentId,
              source: line.source,
              componentCode: line.componentCode,
              componentNameFr: line.componentNameFr,
              componentNameEn: line.componentNameEn,
              pricingModel: line.pricingModel,
              chargeType: line.chargeType,
              revenueCategory: line.revenueCategory,
              billingPeriod: line.billingPeriod,
              metric: line.metric,
              tierMode: line.tierMode,
              quantity: line.quantity,
              quantityUnit: line.quantityUnit,
              proposedUnitAmountMinor: line.proposedUnitAmountMinor,
              internalUse: line.internalUse,
              distributable: line.distributable,
              distributionLimit: line.distributionLimit,
              distributionMetric: line.distributionMetric,
              commercialQuantityBasis: line.commercialQuantityBasis,
              commercialRuleCode: line.commercialRuleCode,
              commercialRuleVersion: line.commercialRuleVersion,
              justification: line.justification,
              displayOrder: line.displayOrder,
              costEfforts: {
                create: line.costEfforts.map((effort) => ({
                  roleCode: effort.roleCode,
                  hours: effort.hours,
                  source: effort.source,
                  justification: effort.justification,
                })),
              },
            })),
          },
        },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'COMMERCIAL_SIMULATION_SCENARIO_DUPLICATED',
        targetType: 'CommercialSimulationScenario',
        targetId: duplicate.id,
        afterData: { workspaceId, sourceScenarioId: source.id },
      });
      return duplicate;
    });
  }

  async archiveScenario(
    workspaceId: string,
    scenarioId: string,
    dto: ScenarioMutationDto,
    actor: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.commercialSimulationWorkspace.findUnique({
        where: { id: workspaceId },
        select: { selectedScenarioId: true },
      });
      if (!workspace) throw new NotFoundException('Workspace introuvable.');
      if (workspace.selectedScenarioId === scenarioId)
        throw new ConflictException('SELECTED_SCENARIO_CANNOT_BE_ARCHIVED');
      const changed = await tx.commercialSimulationScenario.updateMany({
        where: {
          id: scenarioId,
          workspaceId,
          status: 'ACTIVE',
          lockVersion: dto.lockVersion,
        },
        data: {
          status: 'ARCHIVED',
          archivedAt: new Date(),
          lockVersion: { increment: 1 },
        },
      });
      if (changed.count !== 1)
        throw new ConflictException('Scenario changed or unavailable.');
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'COMMERCIAL_SIMULATION_SCENARIO_ARCHIVED',
        targetType: 'CommercialSimulationScenario',
        targetId: scenarioId,
        afterData: { workspaceId, status: 'ARCHIVED' },
      });
      return { id: scenarioId, status: 'ARCHIVED' };
    });
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

  async createScenario(
    workspaceId: string,
    dto: CreateScenarioDto,
    actor?: Actor,
  ) {
    await this.getWorkspace(workspaceId);
    return this.prisma.$transaction(async (tx) => {
      const scenario = await tx.commercialSimulationScenario.create({
        data: { workspaceId, ...dto },
      });
      if (actor)
        await this.audit.record(tx, {
          actorUserId: actor.userId,
          action: 'COMMERCIAL_SIMULATION_SCENARIO_CREATED',
          targetType: 'CommercialSimulationScenario',
          targetId: scenario.id,
          afterData: { workspaceId, name: scenario.name },
        });
      return scenario;
    });
  }

  async configureGuidedScenario(
    workspaceId: string,
    scenarioId: string,
    dto: GuidedConfigureScenarioDto,
    actor: Actor,
  ) {
    const workspace =
      await this.prisma.commercialSimulationWorkspace.findUnique({
        where: { id: workspaceId },
        select: {
          currency: true,
          priceBookVersionId: true,
          scenarios: {
            where: { id: scenarioId, status: 'ACTIVE' },
            select: { lines: { select: { id: true, componentCode: true } } },
          },
        },
      });
    if (!workspace || workspace.scenarios.length !== 1)
      throw new NotFoundException('Scenario introuvable.');
    if (workspace.currency !== 'CAD')
      throw new BadRequestException('Simulator V1 supports CAD only.');

    const familyCodes = [...new Set(dto.familyCodes)];
    if (familyCodes.length !== dto.familyCodes.length)
      throw new BadRequestException('DUPLICATE_COMMERCIAL_FAMILY');
    const families = familyCodes.map((code) => {
      const family = COMMERCIAL_FAMILY_REGISTRY.find(
        (item) => item.code === code,
      );
      if (!family || family.availability === 'FUTURE')
        throw new BadRequestException('COMMERCIAL_FAMILY_NOT_SELECTABLE');
      return family;
    });
    const capabilityCodes = [
      ...new Set(families.flatMap((family) => family.capabilityCodes)),
    ];
    const capabilities = capabilityCodes.length
      ? await this.prisma.commercialCapability.findMany({
          where: {
            code: { in: capabilityCodes },
            isAvailable: true,
            lifecycle: 'CURRENT',
          },
          select: { id: true, code: true },
        })
      : [];
    if (capabilities.length !== capabilityCodes.length)
      throw new BadRequestException('COMMERCIAL_CAPABILITY_NOT_AVAILABLE');
    const capabilityIdByCode = new Map(
      capabilities.map((item) => [item.code, item.id]),
    );

    const catalogIds = dto.catalogLines.map((line) => line.priceComponentId);
    if (new Set(catalogIds).size !== catalogIds.length)
      throw new BadRequestException('DUPLICATE_CATALOG_COMPONENT');
    const components = catalogIds.length
      ? await this.prisma.priceComponent.findMany({
          where: {
            id: { in: catalogIds },
            priceBookVersionId: workspace.priceBookVersionId,
          },
          include: { capability: true },
        })
      : [];
    if (components.length !== catalogIds.length)
      throw new BadRequestException('CATALOG_COMPONENT_INVALID');
    const componentById = new Map(components.map((item) => [item.id, item]));
    const permittedCapabilityCodes = new Set(capabilityCodes);
    for (const component of components) {
      if (!component.revenueCategory)
        throw new BadRequestException('REVENUE_CLASSIFICATION_INCOMPLETE');
      if (
        !permittedCapabilityCodes.has(component.capability.code) &&
        component.revenueCategory !== 'PROFESSIONAL_SERVICE'
      )
        throw new BadRequestException(
          'CATALOG_COMPONENT_OUTSIDE_SELECTED_FAMILY',
        );
    }
    const packaging = validatePackagingSelection({
      familyCodes,
      components: components.map((component) => ({
        componentCode: component.code,
        revenueCategory: component.revenueCategory,
      })),
    });
    const invalidDraft = packagingDraftBlockingIssues(packaging.blockers);
    if (invalidDraft.length)
      throw new BadRequestException({
        code: 'GUIDED_PACKAGING_INVALID',
        policyVersion: packaging.policyVersion,
        blockers: invalidDraft,
      });

    const applicableDrivers = new Set(
      families.flatMap((family) => [
        ...family.applicableDriverCodes,
        ...family.optionalDriverCodes,
      ]),
    );
    const driverCodes = dto.driverValues.map((driver) => driver.driverCode);
    if (new Set(driverCodes).size !== driverCodes.length)
      throw new BadRequestException('DUPLICATE_DRIVER');
    const driverValues = dto.driverValues.map((input) => {
      const definition = resolveSimulatorDriver(input.driverCode, 'v1');
      if (!applicableDrivers.has(definition.code as never))
        throw new BadRequestException('DRIVER_NOT_APPLICABLE');
      const base = {
        driverCode: definition.code,
        driverVersion: definition.version,
        scopeKey: 'GLOBAL',
        valueType: definition.valueType,
        source: 'USER_INPUT' as const,
        unit: definition.unit ?? undefined,
        justification: input.justification,
      };
      if (definition.valueType === 'INTEGER') {
        if (!/^\d+$/.test(input.value))
          throw new BadRequestException('INVALID_INTEGER_DRIVER');
        return { ...base, integerValue: input.value };
      }
      if (definition.valueType === 'DECIMAL') {
        if (!/^\d+(?:\.\d{1,6})?$/.test(input.value))
          throw new BadRequestException('INVALID_DECIMAL_DRIVER');
        return { ...base, decimalValue: input.value };
      }
      if (definition.valueType === 'MONEY')
        return {
          ...base,
          moneyMinorValue: cadToMinor(input.value),
          currency: workspace.currency,
        };
      return { ...base, textValue: input.value };
    });
    const activeSites = dto.driverValues.find(
      (driver) => driver.driverCode === 'ACTIVE_SITES',
    )?.value;
    if (
      familyCodes.includes('PROFESSIONAL') &&
      (!activeSites || !/^\d+$/.test(activeSites) || BigInt(activeSites) <= 0n)
    )
      throw new BadRequestException('ACTIVE_SITES_REQUIRED');

    const existingCodeByLineId = new Map(
      workspace.scenarios[0].lines.map((line) => [line.id, line.componentCode]),
    );
    const catalogLines = dto.catalogLines.map((input, index) => {
      const component = componentById.get(input.priceComponentId)!;
      if (input.proposedUnitAmountCad != null && !input.justification?.trim())
        throw new BadRequestException(
          'CATALOG_OVERRIDE_JUSTIFICATION_REQUIRED',
        );
      return {
        capabilityId: component.capabilityId,
        priceComponentId: component.id,
        source: 'CATALOG_COMPONENT' as const,
        componentCode: component.code,
        componentNameFr: component.nameFr,
        componentNameEn: component.nameEn,
        pricingModel: component.pricingModel,
        chargeType: component.chargeType,
        revenueCategory: component.revenueCategory!,
        billingPeriod: component.billingPeriod ?? undefined,
        metric: component.metric ?? undefined,
        tierMode: component.tierMode ?? undefined,
        quantity:
          component.pricingModel === 'CAPACITY_BAND'
            ? activeSites
            : input.quantity,
        quantityUnit: component.metric ?? undefined,
        commercialQuantityBasis:
          component.pricingModel === 'CAPACITY_BAND'
            ? ('DECLARED' as const)
            : input.commercialQuantityBasis,
        proposedUnitAmountMinor:
          input.proposedUnitAmountCad == null
            ? undefined
            : cadToMinor(input.proposedUnitAmountCad),
        justification: input.justification,
        displayOrder: input.displayOrder ?? index,
        costEfforts: input.costEfforts?.map((effort) => ({
          roleCode: effort.role,
          hours: effort.hours,
          source: 'USER_INPUT' as const,
          justification: effort.justification,
        })),
      };
    });
    const customLines = dto.customLines.map((input, index) => {
      const existingCode = input.lineId
        ? existingCodeByLineId.get(input.lineId)
        : undefined;
      if (input.lineId && !existingCode)
        throw new BadRequestException('CUSTOM_LINE_OUTSIDE_SCENARIO');
      if (input.pricingModel === 'PER_UNIT' && input.metric !== 'HOUR')
        throw new BadRequestException('CUSTOM_PER_UNIT_REQUIRES_HOUR');
      if (input.chargeType === 'RECURRING' && !input.billingPeriod)
        throw new BadRequestException('RECURRING_LINE_REQUIRES_PERIOD');
      if (!input.name.trim())
        throw new BadRequestException('CUSTOM_LINE_NAME_REQUIRED');
      if (!input.justification.trim())
        throw new BadRequestException('CUSTOM_LINE_JUSTIFICATION_REQUIRED');
      return {
        source: input.source,
        componentCode: existingCode ?? `CUSTOM-${randomUUID()}`,
        componentNameFr: input.name.trim(),
        pricingModel: input.pricingModel,
        chargeType: input.chargeType,
        revenueCategory: input.revenueCategory,
        billingPeriod: input.billingPeriod,
        metric: input.metric ?? 'FIXED',
        quantity: input.quantity,
        quantityUnit: input.metric ?? 'FIXED',
        proposedUnitAmountMinor: cadToMinor(input.unitAmountCad),
        justification: input.justification.trim(),
        commercialQuantityBasis: input.commercialQuantityBasis,
        displayOrder: input.displayOrder ?? catalogLines.length + index,
        costEfforts: input.costEfforts?.map((effort) => ({
          roleCode: effort.role,
          hours: effort.hours,
          source: 'USER_INPUT' as const,
          justification: effort.justification,
        })),
      };
    });
    return this.configureScenario(
      workspaceId,
      scenarioId,
      {
        lockVersion: dto.lockVersion,
        capabilityIds: capabilityCodes.map(
          (code) => capabilityIdByCode.get(code)!,
        ),
        lines: [...catalogLines, ...customLines],
        driverValues,
      },
      actor,
    );
  }

  async configureScenario(
    workspaceId: string,
    scenarioId: string,
    dto: ConfigureScenarioDto,
    actor?: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.commercialSimulationWorkspace.findUnique({
        where: { id: workspaceId },
        select: { priceBookVersionId: true },
      });
      if (!workspace)
        throw new NotFoundException('Simulation workspace introuvable.');
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
          let revenueCategory = line.revenueCategory;
          if (line.source === 'CATALOG_COMPONENT') {
            if (!line.priceComponentId)
              throw new BadRequestException('CATALOG_COMPONENT_REQUIRED');
            const component = await tx.priceComponent.findFirst({
              where: {
                id: line.priceComponentId,
                priceBookVersionId: workspace.priceBookVersionId,
              },
              select: { revenueCategory: true },
            });
            if (!component)
              throw new BadRequestException('CATALOG_COMPONENT_INVALID');
            if (!component.revenueCategory)
              throw new BadRequestException(
                'REVENUE_CLASSIFICATION_INCOMPLETE',
              );
            if (
              revenueCategory &&
              revenueCategory !== component.revenueCategory
            )
              throw new BadRequestException('REVENUE_CATEGORY_MISMATCH');
            revenueCategory = component.revenueCategory;
          } else if (!revenueCategory) {
            throw new BadRequestException('REVENUE_CATEGORY_REQUIRED');
          }
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
              revenueCategory,
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
      const scenario = await tx.commercialSimulationScenario.findUniqueOrThrow({
        where: { id: scenarioId },
        include: {
          capabilities: true,
          lines: { include: { costEfforts: true } },
          driverValues: true,
        },
      });
      if (actor)
        await this.audit.record(tx, {
          actorUserId: actor.userId,
          action: 'COMMERCIAL_SIMULATION_SCENARIO_CONFIGURED',
          targetType: 'CommercialSimulationScenario',
          targetId: scenarioId,
          afterData: {
            workspaceId,
            lockVersion: scenario.lockVersion,
            capabilityCount: scenario.capabilities.length,
            lineCount: scenario.lines.length,
            driverCount: scenario.driverValues.length,
          },
        });
      return scenario;
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
              capabilities: { include: { capability: true } },
              lines: {
                include: { costEfforts: true },
                orderBy: { displayOrder: 'asc' },
              },
              runs: {
                orderBy: { calculatedAt: 'desc' },
                take: 1,
                include: {
                  lines: { orderBy: { displayOrder: 'asc' } },
                  inputs: true,
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
    const scenarios = workspace.scenarios.map((scenario) => {
      const run = scenario.runs[0] ?? null;
      const state = !run
        ? ('NOT_CALCULATED' as const)
        : run.scenarioLockVersion !== scenario.lockVersion
          ? ('RECALCULATION_REQUIRED' as const)
          : ('CURRENT' as const);
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
        state,
        calculatedAt:
          state === 'CURRENT' ? run?.calculatedAt.toISOString() : null,
        currency: run?.currency ?? workspace.currency,
        packaging: validatePackagingSelection({
          familyCodes: (() => {
            const familyCodes = COMMERCIAL_FAMILY_REGISTRY.filter(
              (family) =>
                family.code !== 'PROFESSIONAL' &&
                family.capabilityCodes.some((code) =>
                  scenario.capabilities.some(
                    (item) => item.capability.code === code,
                  ),
                ),
            ).map((family) => family.code);
            if (
              scenario.lines.some((line) =>
                line.componentCode.startsWith('CORO_PROFESSIONAL_'),
              )
            )
              familyCodes.push('PROFESSIONAL');
            if (
              scenario.lines.some(
                (line) => line.revenueCategory === 'PROFESSIONAL_SERVICE',
              ) &&
              !familyCodes.includes('PROFESSIONAL_SERVICES')
            )
              familyCodes.push('PROFESSIONAL_SERVICES');
            return familyCodes;
          })(),
          components: scenario.lines.map((line) => ({
            componentCode: line.componentCode,
            revenueCategory: line.revenueCategory,
          })),
        }).status,
        lines:
          state === 'CURRENT'
            ? run.lines.map((line) => ({
                componentCode: line.componentCode,
                label: line.componentNameFr,
                quantity: line.quantity?.toString() ?? null,
                quantityUnit: line.quantityUnit,
                unitAmountMinor:
                  line.proposedUnitAmountMinor?.toString() ?? null,
                extendedAmountMinor:
                  line.proposedExtendedAmountMinor?.toString() ?? null,
                chargeType: line.chargeType,
                billingPeriod: line.billingPeriod,
                professionalService:
                  line.revenueCategory === 'PROFESSIONAL_SERVICE',
                implementation: line.revenueCategory === 'IMPLEMENTATION',
              }))
            : [],
        totals:
          state === 'CURRENT' && run?.priceResult
            ? {
                oneTimeMinor:
                  run.priceResult.oneTimeTotalMinor?.toString() ?? null,
                monthlyRecurringMinor:
                  run.priceResult.recurringMonthlyCadenceMinor?.toString() ??
                  null,
                annualRecurringMinor:
                  run.priceResult.recurringAnnualCadenceMinor?.toString() ??
                  null,
                annualRecurringEquivalentMinor:
                  run.priceResult.annualRecurringEquivalentMinor?.toString() ??
                  null,
                firstYearMinor:
                  run.priceResult.firstYearCommitmentMinor?.toString() ?? null,
              }
            : null,
        internalEconomics:
          state === 'CURRENT'
            ? {
                costMinor:
                  run?.costResult?.firstYearCostMinor.toString() ?? null,
                contributionMinor: margin?.contributionMinor ?? null,
                marginBasisPoints: margin?.marginBasisPoints ?? null,
              }
            : null,
        value:
          state === 'CURRENT'
            ? (run?.valueResults
                .filter((value) => value.status === 'COMPLETE')
                .map((value) => ({
                  metrics: value.metrics
                    .filter((metric) => metric.customerVisible)
                    .map((metric) => ({
                      label: metric.metricCode,
                      decimalValue: metric.decimalValue?.toString() ?? null,
                      moneyMinorValue:
                        metric.moneyMinorValue?.toString() ?? null,
                    })),
                })) ?? [])
            : [],
      };
    });
    const baseline =
      scenarios.find((scenario) => scenario.state === 'CURRENT') ??
      scenarios[0];
    const codes = [
      ...new Set(
        scenarios.flatMap((scenario) =>
          scenario.lines.map((line) => line.componentCode),
        ),
      ),
    ];
    return {
      baselineScenarioName: baseline?.name ?? null,
      scenarios,
      components: codes.map((componentCode) => ({
        componentCode,
        label:
          scenarios
            .flatMap((scenario) => scenario.lines)
            .find((line) => line.componentCode === componentCode)?.label ??
          componentCode,
        scenarios: scenarios.map((scenario) => {
          const line = scenario.lines.find(
            (item) => item.componentCode === componentCode,
          );
          const baseLine = baseline?.lines.find(
            (item) => item.componentCode === componentCode,
          );
          const delta = (
            value: string | null | undefined,
            base: string | null | undefined,
          ) =>
            value == null || base == null
              ? null
              : (BigInt(value) - BigInt(base)).toString();
          return {
            scenarioName: scenario.name,
            included: Boolean(line),
            change:
              scenario.state !== 'CURRENT'
                ? 'UNAVAILABLE'
                : scenario === baseline
                  ? 'BASELINE'
                  : line && !baseLine
                    ? 'ADDED'
                    : !line && baseLine
                      ? 'REMOVED'
                      : line
                        ? 'UNCHANGED'
                        : 'ABSENT',
            professionalService: line?.professionalService ?? false,
            implementation: line?.implementation ?? false,
            quantity: line?.quantity ?? null,
            quantityDelta:
              line?.quantity == null || baseLine?.quantity == null
                ? null
                : new Prisma.Decimal(line.quantity)
                    .minus(baseLine.quantity)
                    .toString(),
            unitAmountMinor: line?.unitAmountMinor ?? null,
            unitAmountDeltaMinor: delta(
              line?.unitAmountMinor,
              baseLine?.unitAmountMinor,
            ),
            extendedAmountMinor: line?.extendedAmountMinor ?? null,
            extendedAmountDeltaMinor: delta(
              line?.extendedAmountMinor,
              baseLine?.extendedAmountMinor,
            ),
          };
        }),
      })),
    };
  }

  async customerPreview(workspaceId: string) {
    const workspace =
      await this.prisma.commercialSimulationWorkspace.findUnique({
        where: { id: workspaceId },
        include: {
          organization: true,
          prospect: true,
          createdBy: true,
          selectedScenario: {
            include: {
              capabilities: { include: { capability: true } },
              lines: true,
              runs: {
                orderBy: { calculatedAt: 'desc' },
                take: 1,
                include: {
                  lines: { orderBy: { displayOrder: 'asc' } },
                  inputs: true,
                  priceResult: true,
                },
              },
            },
          },
        },
      });
    if (!workspace?.selectedScenario)
      throw new BadRequestException('CUSTOMER_PREVIEW_SCENARIO_REQUIRED');
    const scenario = workspace.selectedScenario;
    const run = scenario.runs[0];
    if (!run)
      throw new BadRequestException('CUSTOMER_PREVIEW_CALCULATION_REQUIRED');
    if (run.scenarioLockVersion !== scenario.lockVersion)
      throw new BadRequestException('CUSTOMER_PREVIEW_RECALCULATION_REQUIRED');
    if (!run.priceResult || run.priceStatus !== 'COMPLETE')
      throw new BadRequestException('CUSTOMER_PREVIEW_PRICE_INCOMPLETE');
    await this.assertGuidedPackaging(workspaceId, scenario.id);
    const familyDefinitions = COMMERCIAL_FAMILY_REGISTRY.filter((family) =>
      family.capabilityCodes.some((code) =>
        scenario.capabilities.some((item) => item.capability.code === code),
      ),
    );
    const target = workspace.organization ?? workspace.prospect;
    if (!target)
      throw new BadRequestException('CUSTOMER_PREVIEW_TARGET_REQUIRED');
    return assertCustomerSafeProjection({
      sourceType: 'RUN_PREVIEW',
      reference: null,
      revision: null,
      customer: {
        legalName: 'legalName' in target ? target.legalName : target.name,
        displayName: 'displayName' in target ? target.displayName : target.name,
        contactName: 'contactName' in target ? target.contactName : null,
        email: 'contactEmail' in target ? target.contactEmail : null,
      },
      issuer: {
        brandName: workspace.createdBy?.companyName ?? 'CORO',
        legalName: workspace.createdBy?.companyName ?? null,
        email: workspace.createdBy?.companyEmail ?? null,
        phone: workspace.createdBy?.companyPhone ?? null,
        website: workspace.createdBy?.companyWebsite ?? null,
        address: workspace.createdBy?.companyAddress ?? null,
      },
      currency: run.currency,
      solutions: familyDefinitions.map((family) => ({
        labelFr: family.labelFr,
        labelEn: family.labelEn,
      })),
      lines: run.lines.map((line) => {
        const cadence = customerCadence(line.chargeType, line.billingPeriod);
        const quantityLabel = customerQuantityLabel(line.quantityUnit);
        return {
          labelFr: line.componentNameFr,
          labelEn: null,
          descriptionFr: null,
          descriptionEn: null,
          group: customerLineGroup(line.revenueCategory),
          quantity: line.quantity?.toString() ?? null,
          quantityLabelFr: quantityLabel?.fr ?? null,
          quantityLabelEn: quantityLabel?.en ?? null,
          offeredUnitAmountMinor:
            line.proposedUnitAmountMinor?.toString() ?? null,
          offeredExtendedAmountMinor:
            line.proposedExtendedAmountMinor?.toString() ?? null,
          cadenceFr: cadence.fr,
          cadenceEn: cadence.en,
        };
      }),
      totals: {
        oneTimeMinor: run.priceResult.oneTimeTotalMinor?.toString() ?? null,
        monthlyRecurringMinor:
          run.priceResult.recurringMonthlyCadenceMinor?.toString() ?? null,
        annualRecurringMinor:
          run.priceResult.recurringAnnualCadenceMinor?.toString() ?? null,
        annualRecurringEquivalentMinor:
          run.priceResult.annualRecurringEquivalentMinor?.toString() ?? null,
        firstYearMinor:
          run.priceResult.firstYearCommitmentMinor?.toString() ?? null,
        firstYearIncludesEstimate: run.priceResult.firstYearIncludesEstimate,
      },
      inputs: customerSafeInputs(
        run.inputs.map((input) => ({ ...input, code: input.driverCode })),
      ),
      includedFeatures: [],
      valueAnalysis: null,
      exclusivities: [],
      commitments: [],
      commercialTerms: {
        contextFr: null,
        contextEn: null,
        termsFr: null,
        termsEn: null,
      },
      validity: { validFrom: null, validUntil: null },
    });
  }

  private async assertGuidedPackaging(workspaceId: string, scenarioId: string) {
    const scenario = await this.prisma.commercialSimulationScenario.findFirst({
      where: { id: scenarioId, workspaceId },
      select: {
        capabilities: { select: { capability: { select: { code: true } } } },
        lines: {
          select: {
            source: true,
            componentCode: true,
            revenueCategory: true,
          },
        },
      },
    });
    if (!scenario) throw new NotFoundException('Scenario introuvable.');
    const familyCodes = COMMERCIAL_FAMILY_REGISTRY.filter(
      (family) =>
        family.code !== 'PROFESSIONAL' &&
        family.capabilityCodes.some((code) =>
          scenario.capabilities.some(
            (selection) => selection.capability.code === code,
          ),
        ),
    ).map((family) => family.code);
    if (
      scenario.lines.some((line) =>
        line.componentCode.startsWith('CORO_PROFESSIONAL_'),
      )
    )
      familyCodes.push('PROFESSIONAL');
    if (
      scenario.lines.some(
        (line) => line.revenueCategory === 'PROFESSIONAL_SERVICE',
      ) &&
      !familyCodes.includes('PROFESSIONAL_SERVICES')
    )
      familyCodes.push('PROFESSIONAL_SERVICES');
    const result = validatePackagingSelection({
      familyCodes,
      components: scenario.lines
        .filter((line) => line.source === 'CATALOG_COMPONENT')
        .map((line) => ({
          componentCode: line.componentCode,
          revenueCategory: line.revenueCategory,
        })),
    });
    if (result.status !== 'READY')
      throw new BadRequestException({
        code: 'GUIDED_PACKAGING_NOT_READY',
        policyVersion: result.policyVersion,
        blockers: result.blockers,
      });
    return result;
  }

  async calculateGuided(
    workspaceId: string,
    scenarioId: string,
    dto: CalculateScenarioDto,
    actor: Actor,
  ) {
    await this.assertGuidedPackaging(workspaceId, scenarioId);
    return this.calculate(workspaceId, scenarioId, dto, actor);
  }

  async convertGuided(
    workspaceId: string,
    scenarioId: string,
    runId: string,
    dto: ConvertScenarioDto,
    actor: Actor,
  ) {
    await this.assertGuidedPackaging(workspaceId, scenarioId);
    return this.convert(workspaceId, scenarioId, runId, dto, actor);
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
      const authoritativeCategory =
        component?.revenueCategory ?? line.revenueCategory;
      if (!authoritativeCategory)
        throw new BadRequestException('REVENUE_CLASSIFICATION_INCOMPLETE');
      if (component && line.revenueCategory !== component.revenueCategory)
        throw new BadRequestException('REVENUE_CATEGORY_MISMATCH');
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
    const capacityLines = requestLines.filter(
      (line) => line.pricingModel === 'CAPACITY_BAND',
    );
    if (capacityLines.length) {
      const activeSites = scenario.driverValues.find(
        (driver) => driver.driverCode === 'ACTIVE_SITES',
      )?.integerValue;
      if (!activeSites || activeSites <= 0n)
        throw new BadRequestException('ACTIVE_SITES_REQUIRED');
      if (
        capacityLines.some((line) => line.quantity !== activeSites.toString())
      )
        throw new BadRequestException('ACTIVE_SITES_QUANTITY_MISMATCH');
    }
    const pricingMethodologyVersion = requestLines.some(
      (line) => line.pricingModel === 'CAPACITY_BAND',
    )
      ? 'v2'
      : 'v1';
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
    if (costVersion) {
      const compatibility = assessCostMethodologyCompatibility({
        methodologyCode: costVersion.methodologyCode,
        methodologyVersion: costVersion.methodologyVersion,
        values: costVersion.values,
      });
      if (!compatibility.compatible)
        throw new BadRequestException({
          code: 'COST_ASSUMPTION_METHODOLOGY_INCOMPATIBLE',
          issues: compatibility.issues,
        });
    }
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
      fingerprintVersion: SIMULATOR_FINGERPRINT_VERSION,
      priceBookVersionId: scenario.workspace.priceBookVersionId,
      currency: scenario.workspace.currency,
      pricingMethodology: `proposal-pricing/${pricingMethodologyVersion}`,
      costAssumptionVersionId: dto.costAssumptionVersionId ?? null,
      valuationAssumptionVersionIds: [
        ...(dto.valuationAssumptionVersionIds ?? []),
      ].sort(),
      capabilities: canonicalCapabilityCodes(
        scenario.capabilities.map((item) => item.capability.code),
      ),
      lines: scenario.lines
        .map((line, index) => ({
          ...requestLines[index],
          source: line.source,
          capabilityCode: line.capability?.code ?? null,
          componentNameFr: line.componentNameFr,
          revenueCategory: line.revenueCategory,
          internalUse: line.internalUse,
          distributable: line.distributable,
          distributionLimit: line.distributionLimit?.toString() ?? null,
          distributionMetric: line.distributionMetric,
          commercialQuantityBasis: line.commercialQuantityBasis,
          commercialRuleCode: line.commercialRuleCode,
          commercialRuleVersion: line.commercialRuleVersion,
        }))
        .sort((a, b) => a.code.localeCompare(b.code)),
      costEfforts: scenario.lines
        .map((line) => ({
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
        }))
        .sort((a, b) => a.componentCode.localeCompare(b.componentCode)),
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
        include: CALCULATION_RUN_RESPONSE_INCLUDE,
      });
    if (existing) return calculationRunResponse(existing);
    const priced = this.pricing.calculate({
      currency: 'CAD',
      calculationVersion: `proposal-pricing/${pricingMethodologyVersion}`,
      lines: requestLines,
    });
    if (priced.totals.firstYearCommitmentMinor === null)
      throw new BadRequestException('Scenario pricing is incomplete.');
    const firstYearCommitmentMinor = priced.totals.firstYearCommitmentMinor;
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${scenarioId + calculationKey}, 0))`;
        const retry = await tx.commercialSimulationCalculationRun.findUnique({
          where: { scenarioId_calculationKey: { scenarioId, calculationKey } },
          include: CALCULATION_RUN_RESPONSE_INCLUDE,
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
            fingerprintVersion: SIMULATOR_FINGERPRINT_VERSION,
            inputFingerprint: calculationKey,
            workspaceLockVersion: scenario.workspace.lockVersion,
            scenarioLockVersion: scenario.lockVersion,
            currency: 'CAD',
            pricingMethodologyCode: 'proposal-pricing',
            pricingMethodologyVersion,
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
                labelFr: resolveSimulatorDriver(
                  value.driverCode,
                  value.driverVersion,
                ).labelFr,
                labelEn: resolveSimulatorDriver(
                  value.driverCode,
                  value.driverVersion,
                ).labelEn,
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
                  revenueCategory: source.revenueCategory,
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
                monthlyRecurringEquivalentMinor:
                  priced.totals.monthlyRecurringEquivalentMinor == null
                    ? null
                    : BigInt(priced.totals.monthlyRecurringEquivalentMinor),
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
          include: CALCULATION_RUN_RESPONSE_INCLUDE,
        });
      });
      return calculationRunResponse(created);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        return calculationRunResponse(
          await this.prisma.commercialSimulationCalculationRun.findUniqueOrThrow(
            {
              where: {
                scenarioId_calculationKey: { scenarioId, calculationKey },
              },
              include: CALCULATION_RUN_RESPONSE_INCLUDE,
            },
          ),
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
        include: PROPOSAL_CONVERSION_RESPONSE_INCLUDE,
      });
      if (prior) return proposalConversionResponse(prior);
      const run = await tx.commercialSimulationCalculationRun.findFirst({
        where: { id: runId, scenarioId, workspaceId },
        include: {
          scenario: {
            include: {
              lines: { select: { componentCode: true, justification: true } },
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
      ].map((value) =>
        run.pricingMethodologyVersion === 'v1' ? (value ?? '0') : value,
      );
      const expectedTotals = [
        expected.oneTimeTotalMinor,
        expected.recurringMonthlyCadenceMinor,
        expected.recurringAnnualCadenceMinor,
        expected.monthlyRecurringEquivalentMinor,
        expected.annualRecurringEquivalentMinor,
        expected.estimatedUsageTotalMinor,
        expected.firstYearCommitmentMinor,
      ].map((value) => value?.toString() ?? null);
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
      const scenarioJustification = new Map(
        run.scenario.lines.map((line) => [
          line.componentCode,
          line.justification,
        ]),
      );
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
          calculationVersion:
            run.pricingMethodologyCode + '/' + run.pricingMethodologyVersion,
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
              revenueCategory: line.revenueCategory,
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
              justification: scenarioJustification.get(line.componentCode),
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
          include: PROPOSAL_CONVERSION_RESPONSE_INCLUDE,
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
      return proposalConversionResponse(conversion);
    });
  }
}
