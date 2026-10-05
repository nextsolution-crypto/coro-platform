import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommercialProposalRevisionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import {
  CreateContractFromProposalDto,
  CreateProposalDto,
  CreateProspectDto,
  CreateRevisionDto,
  ConfigureRevisionDto,
  ConvertProspectDto,
  TransitionProposalDto,
  ValueAnalysisDto,
} from './dto/commercial-proposals.dto';
import { ProposalPricingEngine } from './proposal-pricing-engine';
import { PROPOSAL_INPUT_REGISTRY } from './proposal-input-registry';
import { calculateValueAnalysis } from './proposal-value-analysis';
import {
  CommercialBindingError,
  CommercialRuleRegistry,
  PRODUCTION_COMMERCIAL_RULE_REGISTRY,
  validateCommercialQuantityBinding,
} from './commercial-rule-registry';
import { buildProposalCustomerPreview } from './proposal-customer-preview';
import {
  PROPOSAL_DETAIL_INCLUDE,
  proposalDetailResponse,
  proposalRevisionResponse,
} from './proposal-response';

type Actor = { userId: string };
const money = (v: string | undefined) =>
  v === undefined ? undefined : BigInt(v);

@Injectable()
export class CommercialProposalsService {
  constructor(
    private prisma: PrismaService,
    private audit: AdminAuditService,
    private pricing: ProposalPricingEngine,
    private commercialRules: CommercialRuleRegistry = PRODUCTION_COMMERCIAL_RULE_REGISTRY,
  ) {}
  listProposals() {
    return this.prisma.commercialProposal.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        organization: { select: { name: true } },
        prospect: { select: { displayName: true } },
        revisions: { orderBy: { revisionNumber: 'desc' }, take: 1 },
      },
    });
  }
  async proposal(id: string) {
    const proposal = await this.prisma.commercialProposal.findUnique({
      where: { id },
      include: PROPOSAL_DETAIL_INCLUDE,
    });
    return proposalDetailResponse(proposal);
  }
  async customerPreview(proposalId: string, revisionId: string) {
    const revision = await this.prisma.commercialProposalRevision.findFirst({
      where: { id: revisionId, proposalId },
      include: {
        proposal: true,
        lines: true,
        inputs: true,
        exclusivities: { include: { sectors: true } },
        commitments: true,
        valueAnalysis: true,
      },
    });
    if (!revision)
      throw new NotFoundException('Proposal revision introuvable.');
    return buildProposalCustomerPreview(revision);
  }
  listProspects() {
    return this.prisma.commercialProspect.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
  prospect(id: string) {
    return this.prisma.commercialProspect.findUnique({
      where: { id },
      include: { convertedOrganization: true, proposals: true },
    });
  }
  async createProspect(d: CreateProspectDto, a: Actor) {
    return this.prisma.$transaction(async (tx) => {
      const u = await this.user(tx, a);
      const x = await tx.commercialProspect.create({
        data: { ...d, createdByUserId: a.userId, createdByDisplayName: u },
      });
      await this.audit.record(tx, {
        actorUserId: a.userId,
        action: 'PROSPECT_CREATED',
        targetType: 'CommercialProspect',
        targetId: x.id,
        afterData: { reference: x.reference, status: x.status },
      });
      return x;
    });
  }
  async convertProspect(id: string, d: ConvertProspectDto, a: Actor) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id},0))`;
      const p = await tx.commercialProspect.findUnique({
        where: { id },
        include: { convertedOrganization: true },
      });
      if (!p) throw new NotFoundException('Prospect introuvable.');
      if (p.convertedOrganization) return p.convertedOrganization;
      const u = await this.user(tx, a);
      const o = await tx.organization.create({
        data: { name: d.organizationName?.trim() || p.legalName },
      });
      await tx.commercialProspect.update({
        where: { id },
        data: {
          status: 'CONVERTED',
          convertedOrganizationId: o.id,
          convertedAt: new Date(),
          convertedByUserId: a.userId,
          convertedByDisplayName: u,
          lockVersion: { increment: 1 },
        },
      });
      await this.audit.record(tx, {
        actorUserId: a.userId,
        action: 'PROSPECT_CONVERTED',
        targetType: 'CommercialProspect',
        targetId: id,
        organizationId: o.id,
        reason: this.audit.normalizeReason(d.reason, true),
        afterData: { organizationId: o.id },
      });
      return o;
    });
  }
  async createProposal(d: CreateProposalDto, a: Actor) {
    if (Boolean(d.organizationId) === Boolean(d.prospectId))
      throw new BadRequestException('Exactement une cible est requise.');
    return this.prisma.$transaction(async (tx) => {
      const u = await this.user(tx, a);
      const p = await tx.commercialProposal.create({
        data: { ...d, createdByUserId: a.userId, createdByDisplayName: u },
      });
      await this.audit.record(tx, {
        actorUserId: a.userId,
        action: 'PROPOSAL_CREATED',
        targetType: 'CommercialProposal',
        targetId: p.id,
        organizationId: d.organizationId,
        afterData: { reference: p.reference, status: p.status },
      });
      return p;
    });
  }
  async createRevision(proposalId: string, d: CreateRevisionDto, a: Actor) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${proposalId},0))`;
      const p = await tx.commercialProposal.findUnique({
        where: { id: proposalId },
        include: { organization: true, prospect: true },
      });
      if (!p) throw new NotFoundException('Proposal introuvable.');
      const last = await tx.commercialProposalRevision.findFirst({
        where: { proposalId },
        orderBy: { revisionNumber: 'desc' },
      });
      let pb: Prisma.PriceBookVersionGetPayload<{
        include: { priceBook: true };
      }> | null = null;
      if (d.sourcePriceBookVersionId)
        pb = await tx.priceBookVersion.findUnique({
          where: { id: d.sourcePriceBookVersionId },
          include: { priceBook: true },
        });
      const u = await this.user(tx, a);
      const r = await tx.commercialProposalRevision.create({
        data: {
          proposalId,
          revisionNumber: (last?.revisionNumber ?? 0) + 1,
          basedOnRevisionId: d.basedOnRevisionId ?? last?.id,
          sourcePriceBookId: pb?.priceBookId,
          sourcePriceBookVersionId: pb?.id,
          priceBookCodeSnapshot: pb?.priceBook.code,
          priceBookNameSnapshot: pb?.priceBook.name,
          priceBookVersionSnapshot: pb?.versionNumber,
          audienceSnapshot: pb?.priceBook.audience,
          relationshipSnapshot: d.relationship,
          currency: 'CAD',
          validUntil: d.validUntil ? new Date(d.validUntil) : null,
          recipientLegalName: d.recipientLegalName,
          recipientDisplayName: d.recipientDisplayName,
          recipientContactName: d.recipientContactName,
          recipientEmail: d.recipientEmail,
          recipientCountry: d.recipientCountry,
          recipientPreferredLanguage: d.preferredLanguage,
          calculationVersion: 'proposal-pricing/v1',
          createdByUserId: a.userId,
          createdByDisplayName: u,
        },
      });
      await this.audit.record(tx, {
        actorUserId: a.userId,
        action: 'PROPOSAL_REVISION_CREATED',
        targetType: 'CommercialProposalRevision',
        targetId: r.id,
        organizationId: p.organizationId,
        reason: last ? 'Nouvelle révision commerciale' : null,
        afterData: {
          proposalId,
          revisionNumber: r.revisionNumber,
          status: r.status,
        },
      });
      return r;
    });
  }
  async configure(revisionId: string, d: ConfigureRevisionDto, a: Actor) {
    return this.prisma.$transaction(async (tx) => {
      const r = await this.draft(tx, revisionId);
      const catalogIds = d.lines
        .filter((line) => line.source === 'CATALOG_COMPONENT')
        .map((line) => line.sourcePriceComponentId)
        .filter((id): id is string => Boolean(id));
      if (catalogIds.length && !r.sourcePriceBookVersionId)
        throw new BadRequestException('CATALOG_PRICEBOOK_VERSION_REQUIRED');
      const catalogComponents = await tx.priceComponent.findMany({
        where: {
          id: { in: catalogIds },
          priceBookVersionId: r.sourcePriceBookVersionId ?? undefined,
        },
        select: { id: true, revenueCategory: true },
      });
      const categoryByComponentId = new Map(
        catalogComponents.map((component) => [
          component.id,
          component.revenueCategory,
        ]),
      );
      const lines = d.lines.map((line) => {
        if (line.source === 'CATALOG_COMPONENT') {
          if (
            !line.sourcePriceComponentId ||
            !categoryByComponentId.has(line.sourcePriceComponentId)
          )
            throw new BadRequestException('CATALOG_COMPONENT_INVALID');
          const category = categoryByComponentId.get(
            line.sourcePriceComponentId,
          );
          if (!category)
            throw new BadRequestException('REVENUE_CLASSIFICATION_INCOMPLETE');
          if (line.revenueCategory && line.revenueCategory !== category)
            throw new BadRequestException('REVENUE_CATEGORY_MISMATCH');
          return { ...line, revenueCategory: category };
        }
        if (!line.revenueCategory)
          throw new BadRequestException('REVENUE_CATEGORY_REQUIRED');
        return line;
      });
      const capabilityIds = [
        ...new Set(
          lines
            .map((line) => line.capabilityId)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      const capabilities = await tx.commercialCapability.findMany({
        where: { id: { in: capabilityIds } },
        select: { id: true, code: true },
      });
      const capabilityCodeById = new Map(
        capabilities.map((capability) => [capability.id, capability.code]),
      );
      for (const line of lines) {
        try {
          validateCommercialQuantityBinding(
            {
              ...line,
              capabilityCode: line.capabilityId
                ? capabilityCodeById.get(line.capabilityId)
                : null,
            },
            this.commercialRules,
            { requireExplicit: false, requireCurrentRule: false },
          );
        } catch (error) {
          if (error instanceof CommercialBindingError)
            throw new BadRequestException(error.message);
          throw error;
        }
      }
      for (const i of d.inputs)
        if (!(i.code in PROPOSAL_INPUT_REGISTRY))
          throw new BadRequestException(`Input inconnu: ${i.code}`);
      await tx.proposalAdjustment.deleteMany({
        where: { proposalRevisionId: revisionId },
      });
      await tx.proposalInput.deleteMany({
        where: {
          proposalRevisionId: revisionId,
          source: { not: 'OBSERVED_SNAPSHOT' },
        },
      });
      const oldExclusivities = await tx.proposalExclusivity.findMany({
        where: { proposalRevisionId: revisionId },
        select: { id: true },
      });
      const oldExclusivityIds = oldExclusivities.map((item) => item.id);
      await tx.proposalExclusivitySector.deleteMany({
        where: { exclusivityId: { in: oldExclusivityIds } },
      });
      await tx.proposalExclusivityCapability.deleteMany({
        where: { exclusivityId: { in: oldExclusivityIds } },
      });
      await tx.proposalExclusivity.deleteMany({
        where: { proposalRevisionId: revisionId },
      });
      await tx.proposalMinimumCommitment.deleteMany({
        where: { proposalRevisionId: revisionId },
      });
      const old = await tx.proposalLine.findMany({
        where: { proposalRevisionId: revisionId },
        select: { id: true },
      });
      await tx.proposalTierSnapshot.deleteMany({
        where: { proposalLineId: { in: old.map((x) => x.id) } },
      });
      await tx.proposalLine.deleteMany({
        where: { proposalRevisionId: revisionId },
      });
      const globalInputs = d.globalAdjustments.map((x) => ({
        scope: x.scope,
        type: x.adjustmentType,
        basisPoints: x.discountBasisPoints,
        amountMinor: x.overrideAmountMinor,
        justification: x.justification,
      }));
      const calculated = this.pricing.calculate({
        currency: 'CAD',
        calculationVersion: r.calculationVersion,
        includeEstimatedUsageInFirstYear: d.includeEstimatedUsageInFirstYear,
        globalAdjustments: globalInputs,
        lines: lines.map((x) => ({
          code: x.componentCode,
          pricingModel: x.pricingModel,
          chargeType: x.chargeType,
          billingPeriod: x.billingPeriod,
          metric: x.metric,
          quantity: x.quantity,
          quantityUnit: x.quantityUnit,
          amountMinor: x.amountMinor,
          tierMode: x.tierMode,
          tiers: x.tiers.map((t) => ({
            minimumQuantity: t.minimumQuantity,
            maximumQuantity: t.maximumQuantity,
            amountMinor: t.amountMinor,
          })),
          requestedStatus: x.requestedStatus,
          justification: x.justification,
          adjustments: x.adjustments.map((y) => ({
            scope: y.scope,
            type: y.adjustmentType,
            basisPoints: y.discountBasisPoints,
            amountMinor: y.overrideAmountMinor,
            justification: y.justification,
          })),
        })),
      });
      for (const i of d.inputs)
        await tx.proposalInput.create({
          data: {
            ...i,
            proposalRevisionId: revisionId,
            decimalValue: i.decimalValue,
            integerValue: money(i.integerValue),
            moneyMinor: money(i.moneyMinor),
            currency: i.currency ?? null,
          },
        });
      const proposalLineByCode = new Map<string, string>();
      for (let n = 0; n < lines.length; n++) {
        const x = lines[n],
          c = calculated.lines[n];
        const line = await tx.proposalLine.create({
          data: {
            proposalRevisionId: revisionId,
            source: x.source,
            sourcePriceComponentId: x.sourcePriceComponentId,
            capabilityId: x.capabilityId,
            componentCode: x.componentCode,
            componentNameFR: x.componentNameFR,
            componentNameEN: x.componentNameEN,
            pricingModel: x.pricingModel,
            chargeType: x.chargeType,
            revenueCategory: x.revenueCategory,
            billingPeriod: x.billingPeriod,
            metric: x.metric,
            tierMode: x.tierMode,
            quantity: x.quantity,
            quantityUnit: x.quantityUnit,
            catalogUnitAmountMinor: money(
              c.catalogUnitAmountMinor ?? undefined,
            ),
            proposedUnitAmountMinor: money(
              c.proposedUnitAmountMinor ?? undefined,
            ),
            catalogExtendedAmountMinor: money(
              c.catalogExtendedAmountMinor ?? undefined,
            ),
            proposedExtendedAmountMinor: money(
              c.proposedExtendedAmountMinor ?? undefined,
            ),
            calculationStatus: c.status,
            calculationFormula: c.calculationFormula,
            calculationExplanationFR: c.explanation,
            internalUse: x.internalUse,
            distributable: x.distributable,
            distributionLimit: x.distributionLimit,
            distributionMetric: x.distributionMetric,
            commercialQuantityBasis: x.commercialQuantityBasis,
            commercialRuleCode: x.commercialRuleCode,
            commercialRuleVersion: x.commercialRuleVersion,
            justification: x.justification,
            displayOrder: x.displayOrder,
            tiers: {
              create: c.tiersUsed.map((t, k) => ({
                minimumQuantity: t.minimumQuantity,
                maximumQuantity: t.maximumQuantity,
                amountMinor: BigInt(t.amountMinor),
                quantityApplied: t.quantityApplied,
                extendedAmountMinor: BigInt(t.extendedAmountMinor),
                displayOrder: k,
              })),
            },
          },
        });
        proposalLineByCode.set(line.componentCode, line.id);
        for (const ad of x.adjustments)
          await tx.proposalAdjustment.create({
            data: {
              proposalRevisionId: revisionId,
              proposalLineId: line.id,
              scope: ad.scope,
              adjustmentType: ad.adjustmentType,
              discountBasisPoints: ad.discountBasisPoints,
              overrideAmountMinor: money(ad.overrideAmountMinor),
              justification: ad.justification,
              displayOrder: ad.displayOrder,
            },
          });
      }
      for (const ad of d.globalAdjustments)
        await tx.proposalAdjustment.create({
          data: {
            proposalRevisionId: revisionId,
            scope: ad.scope,
            adjustmentType: ad.adjustmentType,
            discountBasisPoints: ad.discountBasisPoints,
            overrideAmountMinor: money(ad.overrideAmountMinor),
            justification: ad.justification,
            displayOrder: ad.displayOrder,
          },
        });
      for (const exclusivity of d.exclusivities) {
        const economicProposalLineId = exclusivity.economicComponentCode
          ? proposalLineByCode.get(exclusivity.economicComponentCode)
          : undefined;
        if (exclusivity.hasEconomicImpact && !economicProposalLineId) {
          throw new BadRequestException(
            'Une exclusivité économique doit référencer une ligne EXCLUSIVITY_FEE de la révision.',
          );
        }
        const economicLine = exclusivity.economicComponentCode
          ? lines.find(
              (line) =>
                line.componentCode === exclusivity.economicComponentCode,
            )
          : undefined;
        if (economicLine && economicLine.source !== 'EXCLUSIVITY_FEE') {
          throw new BadRequestException(
            'La ligne économique d’une exclusivité doit être de type EXCLUSIVITY_FEE.',
          );
        }
        await tx.proposalExclusivity.create({
          data: {
            proposalRevisionId: revisionId,
            territoryType: exclusivity.territoryType,
            territoryCode: exclusivity.territoryCode,
            territoryLabel: exclusivity.territoryLabel,
            startsAt: new Date(exclusivity.startsAt),
            endsAt: exclusivity.endsAt
              ? new Date(exclusivity.endsAt)
              : undefined,
            conditions: exclusivity.conditions,
            renewalTerms: exclusivity.renewalTerms,
            hasEconomicImpact: exclusivity.hasEconomicImpact,
            economicProposalLineId,
            sectors: { create: exclusivity.sectors },
            capabilities: {
              create: exclusivity.capabilityIds.map((capabilityId) => ({
                capabilityId,
              })),
            },
          },
        });
      }
      for (const commitment of d.commitments) {
        await tx.proposalMinimumCommitment.create({
          data: {
            proposalRevisionId: revisionId,
            type: commitment.type,
            period: commitment.period,
            amountMinor: money(commitment.amountMinor),
            quantity: commitment.quantity,
            currency: commitment.currency,
            unit: commitment.unit,
            description: commitment.description,
          },
        });
      }
      await tx.commercialProposalRevision.update({
        where: { id: revisionId },
        data: {
          oneTimeTotalMinor: money(
            calculated.totals.oneTimeTotalMinor ?? undefined,
          ),
          recurringMonthlyCadenceMinor: money(
            calculated.totals.recurringMonthlyCadenceMinor ?? undefined,
          ),
          recurringAnnualCadenceMinor: money(
            calculated.totals.recurringAnnualCadenceMinor ?? undefined,
          ),
          monthlyRecurringEquivalentMinor: money(
            calculated.totals.monthlyRecurringEquivalentMinor ?? undefined,
          ),
          annualRecurringEquivalentMinor: money(
            calculated.totals.annualRecurringEquivalentMinor ?? undefined,
          ),
          estimatedUsageTotalMinor: money(
            calculated.totals.estimatedUsageTotalMinor ?? undefined,
          ),
          firstYearCommitmentMinor: money(
            calculated.totals.firstYearCommitmentMinor ?? undefined,
          ),
          firstYearIncludesEstimate:
            calculated.totals.firstYearIncludesEstimate,
          calculatedAt: new Date(),
          contextFR: d.contextFR,
          contextEN: d.contextEN,
          termsFR: d.termsFR,
          termsEN: d.termsEN,
          lockVersion: { increment: 1 },
        },
      });
      await this.audit.record(tx, {
        actorUserId: a.userId,
        action: 'PROPOSAL_PRICE_RECALCULATED',
        targetType: 'CommercialProposalRevision',
        targetId: revisionId,
        organizationId: r.proposal.organizationId,
        afterData: {
          lineCount: d.lines.length,
          totals: Object.fromEntries(
            Object.entries(calculated.totals).map(([key, value]) => [
              key,
              value === null ? 'NOT_AVAILABLE' : value,
            ]),
          ),
          calculationVersion: r.calculationVersion,
        },
      });
      return calculated;
    });
  }
  async setValueAnalysis(id: string, d: ValueAnalysisDto, a: Actor) {
    const result = calculateValueAnalysis(d);
    return this.prisma.$transaction(async (tx) => {
      const r = await this.draft(tx, id);
      const x = await tx.proposalValueAnalysis.upsert({
        where: { proposalRevisionId: id },
        create: {
          proposalRevisionId: id,
          mandatesPerYear: d.mandatesPerYear,
          averageHoursPerMandate: d.averageHoursPerMandate,
          currentBillableRateMinorPerHour: BigInt(d.billableRateMinorPerHour),
          estimatedProductivityGainBasisPoints: d.productivityGainBasisPoints,
          estimatedHoursSaved: result.estimatedHoursSaved,
          estimatedCapacityValueMinor: BigInt(
            result.estimatedCapacityValueMinor,
          ),
          methodologyVersion: result.methodologyVersion,
          roundingPolicy: result.roundingPolicy,
          disclaimerFR: d.disclaimerFR,
          disclaimerEN: d.disclaimerEN,
        },
        update: {
          mandatesPerYear: d.mandatesPerYear,
          averageHoursPerMandate: d.averageHoursPerMandate,
          currentBillableRateMinorPerHour: BigInt(d.billableRateMinorPerHour),
          estimatedProductivityGainBasisPoints: d.productivityGainBasisPoints,
          estimatedHoursSaved: result.estimatedHoursSaved,
          estimatedCapacityValueMinor: BigInt(
            result.estimatedCapacityValueMinor,
          ),
          disclaimerFR: d.disclaimerFR,
          disclaimerEN: d.disclaimerEN,
        },
      });
      await this.audit.record(tx, {
        actorUserId: a.userId,
        action: 'PROPOSAL_UPDATED',
        targetType: 'CommercialProposalRevision',
        targetId: id,
        organizationId: r.proposal.organizationId,
        afterData: {
          valueAnalysis: true,
          methodologyVersion: result.methodologyVersion,
        },
      });
      return x;
    });
  }
  async snapshotPopulation(
    revisionId: string,
    facilityProfileId: string,
    a: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const revision = await this.draft(tx, revisionId);
      if (!revision.proposal.organizationId)
        throw new BadRequestException(
          'Un snapshot Population exige une Organization cible.',
        );
      const profile = await tx.rueFacilityProfile.findUnique({
        where: { id: facilityProfileId },
        include: {
          building: true,
          populationProgram: { select: { id: true } },
          _count: {
            select: {
              substances: true,
              emergencyScenarios: true,
              surroundingAssets: true,
            },
          },
          emergencyScenarios: {
            where: { impactDistanceKm: { not: null } },
            select: { impactDistanceKm: true },
          },
        },
      });
      if (
        !profile ||
        profile.building.organizationId !== revision.proposal.organizationId
      )
        throw new NotFoundException('Installation Population introuvable.');
      const impactZoneCount = await tx.rueImpactZone.count({
        where: { scenario: { facilityProfileId } },
      });
      const potentialRecipients = profile.populationProgram
        ? await tx.populationSubscriber.count({
            where: { programId: profile.populationProgram.id },
          })
        : 0;
      const distances = profile.emergencyScenarios
        .map((scenario) => scenario.impactDistanceKm)
        .filter((distance): distance is number => distance !== null);
      const observed: Array<{
        code: string;
        valueType: 'TEXT' | 'INTEGER' | 'DECIMAL';
        value: string | number;
        labelFR: string;
      }> = [
        {
          code: 'POPULATION_SITE',
          valueType: 'TEXT',
          value: profile.building.name,
          labelFR: 'Installation',
        },
        {
          code: 'POPULATION_MUNICIPALITY',
          valueType: 'TEXT',
          value: profile.building.city,
          labelFR: 'Municipalité',
        },
        {
          code: 'SUBSTANCE_COUNT',
          valueType: 'INTEGER',
          value: profile._count.substances,
          labelFR: 'Substances',
        },
        {
          code: 'SCENARIO_COUNT',
          valueType: 'INTEGER',
          value: profile._count.emergencyScenarios,
          labelFR: 'Scénarios',
        },
        {
          code: 'IMPACT_ZONE_COUNT',
          valueType: 'INTEGER',
          value: impactZoneCount,
          labelFR: 'Zones d’impact',
        },
        {
          code: 'SENSITIVE_ASSET_COUNT',
          valueType: 'INTEGER',
          value: profile._count.surroundingAssets,
          labelFR: 'Actifs sensibles',
        },
        {
          code: 'POTENTIAL_RECIPIENTS',
          valueType: 'INTEGER',
          value: potentialRecipients,
          labelFR: 'Destinataires potentiels',
        },
      ];
      if (distances.length)
        observed.push({
          code: 'MAX_IMPACT_DISTANCE',
          valueType: 'DECIMAL',
          value: Math.max(...distances).toString(),
          labelFR: 'Distance d’impact maximale',
        });
      const codes = observed.map(({ code }) => code);
      await tx.proposalInput.deleteMany({
        where: { proposalRevisionId: revisionId, code: { in: codes } },
      });
      for (let index = 0; index < observed.length; index++) {
        const input = observed[index];
        await tx.proposalInput.create({
          data: {
            proposalRevisionId: revisionId,
            code: input.code,
            category: 'COMPLEXITY',
            valueType: input.valueType,
            integerValue:
              input.valueType === 'INTEGER' ? BigInt(input.value) : undefined,
            decimalValue:
              input.valueType === 'DECIMAL' ? String(input.value) : undefined,
            textValue:
              input.valueType === 'TEXT' ? String(input.value) : undefined,
            unit: input.code === 'MAX_IMPACT_DISTANCE' ? 'KM' : undefined,
            source: 'OBSERVED_SNAPSHOT',
            labelFR: input.labelFR,
            justification: `Snapshot explicite du profil Population ${facilityProfileId}`,
            displayOrder: 100 + index,
          },
        });
      }
      await this.audit.record(tx, {
        actorUserId: a.userId,
        action: 'PROPOSAL_POPULATION_SNAPSHOT_CREATED',
        targetType: 'CommercialProposalRevision',
        targetId: revisionId,
        organizationId: revision.proposal.organizationId,
        afterData: { facilityProfileId, inputCodes: codes },
      });
      return { source: 'OBSERVED_SNAPSHOT', inputCodes: codes };
    });
  }
  async transition(
    id: string,
    target: CommercialProposalRevisionStatus,
    d: TransitionProposalDto,
    a: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id},0))`;
      const r = await tx.commercialProposalRevision.findUnique({
        where: { id },
        include: {
          proposal: true,
          sentDocument: true,
          lines: { include: { capability: true } },
        },
      });
      if (!r) throw new NotFoundException();
      const allowed: Record<string, string[]> = {
        DRAFT: ['INTERNAL_REVIEW', 'READY', 'CANCELLED'],
        INTERNAL_REVIEW: ['DRAFT', 'READY', 'CANCELLED'],
        READY: ['SENT', 'CANCELLED'],
        SENT: ['ACCEPTED', 'REJECTED', 'SUPERSEDED'],
        ACCEPTED: [],
        REJECTED: [],
        SUPERSEDED: [],
        CANCELLED: [],
      };
      if (!allowed[r.status].includes(target))
        throw new BadRequestException('Transition invalide.');
      if (target === 'READY') {
        for (const line of r.lines) {
          try {
            validateCommercialQuantityBinding(
              { ...line, capabilityCode: line.capability?.code },
              this.commercialRules,
              { requireExplicit: true, requireCurrentRule: true },
            );
          } catch (error) {
            if (error instanceof CommercialBindingError)
              throw new BadRequestException(error.message);
            throw error;
          }
        }
        buildProposalCustomerPreview({
          ...r,
          inputs: await tx.proposalInput.findMany({
            where: { proposalRevisionId: id },
          }),
          exclusivities: await tx.proposalExclusivity.findMany({
            where: { proposalRevisionId: id },
            include: { sectors: true },
          }),
          commitments: await tx.proposalMinimumCommitment.findMany({
            where: { proposalRevisionId: id },
          }),
          valueAnalysis: await tx.proposalValueAnalysis.findUnique({
            where: { proposalRevisionId: id },
          }),
        });
      }
      if (target === 'SENT' && !d.sentDocumentId)
        throw new BadRequestException('Document envoyé requis.');
      if (target === 'ACCEPTED' && (!d.acceptedByName || !r.sentDocumentId))
        throw new BadRequestException('Acceptation et document envoyé requis.');
      const reason = this.audit.normalizeReason(d.reason, true);
      const data: Prisma.CommercialProposalRevisionUncheckedUpdateManyInput = {
        status: target,
        lifecycleReason: reason,
        lockVersion: { increment: 1 },
      };
      if (target === 'SENT') {
        data.sentAt = new Date();
        data.sentDocumentId = d.sentDocumentId;
      }
      if (target === 'ACCEPTED') {
        data.acceptedAt = new Date();
        data.acceptedByName = d.acceptedByName;
        data.acceptanceReference = d.acceptanceReference;
      }
      if (target === 'REJECTED') data.rejectedAt = new Date();
      if (target === 'CANCELLED') data.cancelledAt = new Date();
      if (target === 'SUPERSEDED') data.supersededAt = new Date();
      const updated = await tx.commercialProposalRevision.updateMany({
        where: { id, lockVersion: d.lockVersion },
        data,
      });
      if (updated.count !== 1)
        throw new ConflictException('Conflit de version.');
      if (target === 'ACCEPTED')
        await tx.commercialProposal.update({
          where: { id: r.proposalId },
          data: {
            status: 'ACCEPTED',
            acceptedRevisionId: id,
            acceptedAt: new Date(),
            lockVersion: { increment: 1 },
          },
        });
      await this.audit.record(tx, {
        actorUserId: a.userId,
        action: `PROPOSAL_${target}`,
        targetType: 'CommercialProposalRevision',
        targetId: id,
        organizationId: r.proposal.organizationId,
        reason,
        beforeData: { status: r.status },
        afterData: { status: target },
      });
      const transitioned =
        await tx.commercialProposalRevision.findUniqueOrThrow({
          where: { id },
        });
      return proposalRevisionResponse(transitioned);
    });
  }
  async createContract(id: string, d: CreateContractFromProposalDto, a: Actor) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id},0))`;
      const r = await tx.commercialProposalRevision.findUnique({
        where: { id },
        include: {
          proposal: { include: { prospect: true } },
          lines: { include: { tiers: true } },
          adjustments: true,
          exclusivities: { include: { sectors: true, capabilities: true } },
          commitments: true,
        },
      });
      if (!r || r.status !== 'ACCEPTED')
        throw new BadRequestException('Révision ACCEPTED requise.');
      const existing = await tx.organizationContractRevision.findUnique({
        where: { sourceProposalRevisionId: id },
        include: { contract: true },
      });
      if (existing) return existing.contract;
      const organizationId =
        r.proposal.organizationId ??
        r.proposal.prospect?.convertedOrganizationId;
      if (!organizationId)
        throw new BadRequestException(
          'Le Prospect doit être converti en Organization.',
        );
      if (!r.sourcePriceBookVersionId)
        throw new BadRequestException('PriceBookVersion source requise.');
      const u = await this.user(tx, a);
      const contract = await tx.organizationContract.create({
        data: {
          organizationId,
          reference: d.reference,
          title: d.title,
          createdByUserId: a.userId,
          createdByDisplayName: u,
        },
      });
      const cr = await tx.organizationContractRevision.create({
        data: {
          contractId: contract.id,
          revisionNumber: 1,
          revisionType: 'INITIAL',
          status: 'DRAFT',
          priceBookVersionId: r.sourcePriceBookVersionId,
          currency: r.currency,
          effectiveFrom: r.validFrom ?? new Date(),
          termStartAt: r.validFrom ?? new Date(),
          sourceProposalRevisionId: id,
          createdByUserId: a.userId,
          createdByDisplayName: u,
          priceLines: {
            create: r.lines.map((l) => ({
              source:
                l.source === 'CATALOG_COMPONENT'
                  ? 'CATALOG_COMPONENT'
                  : l.source === 'EXCLUSIVITY_FEE'
                    ? 'EXCLUSIVITY_FEE'
                    : 'CUSTOM_COMPONENT',
              sourcePriceComponentId: l.sourcePriceComponentId,
              capabilityId: l.capabilityId,
              componentCode: l.componentCode,
              componentName: l.componentNameFR,
              pricingModel: l.pricingModel,
              chargeType: l.chargeType,
              revenueCategory: l.revenueCategory,
              billingPeriod: l.billingPeriod,
              metric: l.metric,
              tierMode: l.tierMode,
              currency: r.currency,
              catalogAmountMinor: l.catalogUnitAmountMinor,
              contractAmountMinor: l.proposedUnitAmountMinor,
              quantity: l.quantity,
              quantityUnit: l.quantityUnit,
              catalogExtendedAmountMinor: l.catalogExtendedAmountMinor,
              contractExtendedAmountMinor: l.proposedExtendedAmountMinor,
              calculationStatus: l.calculationStatus,
              calculationFormula: l.calculationFormula,
              calculationExplanation: l.calculationExplanationFR,
              internalUse: l.internalUse,
              distributable: l.distributable,
              distributionLimit: l.distributionLimit,
              distributionMetric: l.distributionMetric,
              commercialQuantityBasis: l.commercialQuantityBasis,
              commercialRuleCode: l.commercialRuleCode,
              commercialRuleVersion: l.commercialRuleVersion,
              displayOrder: l.displayOrder,
              tiers: {
                create: l.tiers.map((t) => ({
                  minimumQuantity: t.minimumQuantity,
                  maximumQuantity: t.maximumQuantity,
                  catalogAmountMinor: t.amountMinor,
                  contractAmountMinor: t.amountMinor,
                  displayOrder: t.displayOrder,
                })),
              },
            })),
          },
          adjustments: {
            create: r.adjustments.map((x) => {
              const line = r.lines.find((l) => l.id === x.proposalLineId);
              return {
                scope: x.scope,
                adjustmentType: x.adjustmentType,
                revenueCategory: line?.revenueCategory,
                sourcePriceComponentId: line?.sourcePriceComponentId,
                capabilityId: line?.capabilityId,
                code: line?.componentCode,
                label: line?.componentNameFR,
                discountBasisPoints: x.discountBasisPoints,
                overrideAmountMinor: x.overrideAmountMinor,
                justification: x.justification,
                displayOrder: x.displayOrder,
              };
            }),
          },
          commitments: {
            create: r.commitments.map((x) => ({
              type: x.type,
              period: x.period,
              amountMinor: x.amountMinor,
              quantity: x.quantity,
              currency: x.currency,
              unit: x.unit,
              description: x.description,
            })),
          },
        },
      });
      const contractLines = await tx.contractPriceSnapshotLine.findMany({
        where: { contractRevisionId: cr.id },
        select: { id: true, componentCode: true },
      });
      const contractLineByCode = new Map(
        contractLines.map((line) => [line.componentCode, line.id]),
      );
      const proposalLineById = new Map(r.lines.map((line) => [line.id, line]));
      for (const exclusivity of r.exclusivities) {
        const economicProposalLine = exclusivity.economicProposalLineId
          ? proposalLineById.get(exclusivity.economicProposalLineId)
          : undefined;
        const economicSnapshotLineId = economicProposalLine
          ? contractLineByCode.get(economicProposalLine.componentCode)
          : undefined;
        if (exclusivity.hasEconomicImpact && !economicSnapshotLineId) {
          throw new ConflictException(
            'La ligne économique de l’exclusivité ne peut pas être reliée au snapshot contractuel.',
          );
        }
        await tx.contractExclusivity.create({
          data: {
            contractRevisionId: cr.id,
            territoryType: exclusivity.territoryType,
            territoryCode: exclusivity.territoryCode,
            territoryLabel: exclusivity.territoryLabel,
            startsAt: exclusivity.startsAt,
            endsAt: exclusivity.endsAt,
            hasEconomicImpact: exclusivity.hasEconomicImpact,
            economicSnapshotLineId,
            conditions: exclusivity.conditions,
            renewalTerms: exclusivity.renewalTerms,
            sectors: {
              create: exclusivity.sectors.map((sector) => ({
                sectorCode: sector.sectorCode,
                sectorLabel: sector.sectorLabel,
              })),
            },
            capabilities: {
              create: exclusivity.capabilities.map((capability) => ({
                capabilityId: capability.capabilityId,
              })),
            },
          },
        });
      }
      await this.audit.record(tx, {
        actorUserId: a.userId,
        action: 'CONTRACT_CREATED_FROM_PROPOSAL',
        targetType: 'OrganizationContract',
        targetId: contract.id,
        organizationId,
        reason: this.audit.normalizeReason(d.reason, true),
        afterData: { proposalRevisionId: id, contractRevisionId: cr.id },
      });
      return contract;
    });
  }
  private async draft(tx: Prisma.TransactionClient, id: string) {
    const r = await tx.commercialProposalRevision.findUnique({
      where: { id },
      include: { proposal: true },
    });
    if (!r) throw new NotFoundException();
    if (r.status !== 'DRAFT')
      throw new ConflictException('Seule une révision DRAFT est modifiable.');
    return r;
  }
  private async user(tx: Prisma.TransactionClient, a: Actor) {
    const u = await tx.user.findUnique({ where: { id: a.userId } });
    if (!u) throw new BadRequestException('Acteur introuvable.');
    return `${u.firstName} ${u.lastName}`.trim();
  }
}
