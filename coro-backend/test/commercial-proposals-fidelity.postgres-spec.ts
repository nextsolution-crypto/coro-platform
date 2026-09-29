import { PrismaClient } from '@prisma/client';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { CommercialProposalsService } from '../src/commercial-proposals/commercial-proposals.service';
import { ProposalPricingEngine } from '../src/commercial-proposals/proposal-pricing-engine';
import { PrismaService } from '../src/prisma/prisma.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase('Phase 2D Proposal to Contract fidelity', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  const service = new CommercialProposalsService(
    prisma as unknown as PrismaService,
    new AdminAuditService(),
    new ProposalPricingEngine(),
  );
  const fixture = `p2d_fidelity_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  afterAll(async () => prisma.$disconnect());

  it('copies Partner terms, exclusivity and commitments without provisioning entitlements', async () => {
    const organization = await prisma.organization.create({
      data: { name: fixture, commercialRelationship: 'PARTNER' },
    });
    const actor = await prisma.user.create({
      data: {
        email: `${fixture}@example.test`,
        password: 'test-only-not-a-real-credential',
        firstName: 'Phase',
        lastName: 'TwoD',
        role: 'SUPER_ADMIN',
        organizationId: organization.id,
      },
    });
    const capability = await prisma.commercialCapability.findUniqueOrThrow({
      where: { code: 'SENTINELLE' },
    });
    const priceBook = await prisma.priceBook.create({
      data: {
        code: fixture,
        name: fixture,
        audience: 'PARTNER',
        currency: 'CAD',
        versions: { create: { versionNumber: 1 } },
      },
      include: { versions: true },
    });
    const catalogComponent = await prisma.priceComponent.create({
      data: {
        priceBookVersionId: priceBook.versions[0].id,
        capabilityId: capability.id,
        code: `${fixture}_CATALOG`,
        nameFr: 'Sentinelle catalogue',
        nameEn: 'Catalog Sentinelle',
        pricingModel: 'TIERED',
        chargeType: 'RECURRING',
        billingPeriod: 'MONTH',
        metric: 'SITE',
        tierMode: 'VOLUME',
        displayOrder: 1,
      },
    });
    const catalogFixedComponent = await prisma.priceComponent.create({
      data: {
        priceBookVersionId: priceBook.versions[0].id,
        capabilityId: capability.id,
        code: `${fixture}_CATALOG_FIXED`,
        nameFr: 'Composante forfaitaire',
        nameEn: 'Flat component',
        pricingModel: 'FLAT',
        chargeType: 'ONE_TIME',
        amountMinor: 25000n,
        displayOrder: 2,
      },
    });
    const proposal = await prisma.commercialProposal.create({
      data: {
        reference: fixture,
        title: 'Partner fidelity fixture',
        organizationId: organization.id,
        createdByUserId: actor.id,
      },
    });
    const revision = await prisma.commercialProposalRevision.create({
      data: {
        proposalId: proposal.id,
        revisionNumber: 1,
        sourcePriceBookId: priceBook.id,
        sourcePriceBookVersionId: priceBook.versions[0].id,
        relationshipSnapshot: 'PARTNER',
        currency: 'CAD',
        recipientLegalName: fixture,
        recipientDisplayName: fixture,
        recipientCountry: 'CA',
        recipientPreferredLanguage: 'FR',
        calculationVersion: 'proposal-pricing/v1',
        createdByUserId: actor.id,
        lines: {
          create: [
            {
              source: 'CATALOG_COMPONENT',
              sourcePriceComponentId: catalogComponent.id,
              capabilityId: capability.id,
              componentCode: catalogComponent.code,
              componentNameFR: catalogComponent.nameFr,
              componentNameEN: catalogComponent.nameEn,
              pricingModel: 'TIERED',
              chargeType: 'RECURRING',
              billingPeriod: 'MONTH',
              metric: 'SITE',
              tierMode: 'VOLUME',
              quantity: '20',
              quantityUnit: 'SITE',
              catalogUnitAmountMinor: 900n,
              proposedUnitAmountMinor: 850n,
              catalogExtendedAmountMinor: 18000n,
              proposedExtendedAmountMinor: 17000n,
              calculationStatus: 'CALCULATED',
              calculationFormula: '20 × 850',
              calculationExplanationFR: 'Grille catalogue snapshotée',
              displayOrder: 1,
              tiers: {
                create: [
                  {
                    minimumQuantity: '1',
                    maximumQuantity: '6',
                    amountMinor: 1000n,
                    displayOrder: 1,
                  },
                  {
                    minimumQuantity: '6',
                    maximumQuantity: null,
                    amountMinor: 900n,
                    quantityApplied: '20',
                    extendedAmountMinor: 18000n,
                    displayOrder: 2,
                  },
                ],
              },
            },
            {
              source: 'CATALOG_COMPONENT',
              sourcePriceComponentId: catalogFixedComponent.id,
              capabilityId: capability.id,
              componentCode: catalogFixedComponent.code,
              componentNameFR: catalogFixedComponent.nameFr,
              componentNameEN: catalogFixedComponent.nameEn,
              pricingModel: 'FLAT',
              chargeType: 'ONE_TIME',
              catalogUnitAmountMinor: 25000n,
              proposedUnitAmountMinor: 22000n,
              catalogExtendedAmountMinor: 25000n,
              proposedExtendedAmountMinor: 22000n,
              calculationStatus: 'CALCULATED',
              calculationFormula: 'fixed override',
              calculationExplanationFR: 'Forfait catalogue ajusté',
              displayOrder: 2,
            },
            {
              source: 'CUSTOM_COMPONENT',
              capabilityId: capability.id,
              componentCode: `${fixture}_SENTINELLE`,
              componentNameFR: 'Sentinelle',
              pricingModel: 'CUSTOM',
              chargeType: 'RECURRING',
              billingPeriod: 'MONTH',
              metric: 'SITE',
              quantity: '50',
              quantityUnit: 'SITE',
              catalogUnitAmountMinor: 2000n,
              proposedUnitAmountMinor: 1800n,
              catalogExtendedAmountMinor: 100000n,
              proposedExtendedAmountMinor: 90000n,
              calculationStatus: 'MANUAL',
              calculationFormula: '50 × accepted unit amount',
              calculationExplanationFR: 'Snapshot Partner accepté',
              internalUse: false,
              distributable: true,
              distributionLimit: '50',
              distributionMetric: 'SITE',
              displayOrder: 3,
            },
            {
              source: 'EXCLUSIVITY_FEE',
              componentCode: `${fixture}_EXCLUSIVITY`,
              componentNameFR: 'Frais exclusivité',
              pricingModel: 'FLAT',
              chargeType: 'ONE_TIME',
              catalogUnitAmountMinor: 50000n,
              proposedUnitAmountMinor: 50000n,
              catalogExtendedAmountMinor: 50000n,
              proposedExtendedAmountMinor: 50000n,
              calculationStatus: 'MANUAL',
              calculationFormula: 'accepted fixed fee',
              calculationExplanationFR: 'Frais économique snapshoté',
              internalUse: false,
              distributable: false,
              displayOrder: 4,
            },
          ],
        },
      },
      include: { lines: true },
    });
    const catalogLine = revision.lines.find(
      (line) => line.source === 'CATALOG_COMPONENT',
    )!;
    const customLine = revision.lines.find(
      (line) => line.source === 'CUSTOM_COMPONENT',
    )!;
    const catalogFixedLine = revision.lines.find(
      (line) => line.sourcePriceComponentId === catalogFixedComponent.id,
    )!;
    await prisma.proposalAdjustment.createMany({
      data: [
        {
          proposalRevisionId: revision.id,
          scope: 'GLOBAL',
          adjustmentType: 'PERCENT_DISCOUNT',
          discountBasisPoints: 500,
          justification: 'Global accepted discount',
          displayOrder: 1,
        },
        {
          proposalRevisionId: revision.id,
          proposalLineId: catalogFixedLine.id,
          scope: 'COMPONENT',
          adjustmentType: 'PERCENT_DISCOUNT',
          discountBasisPoints: 250,
          justification: 'Catalog component discount',
          displayOrder: 2,
        },
        {
          proposalRevisionId: revision.id,
          proposalLineId: catalogLine.id,
          scope: 'COMPONENT',
          adjustmentType: 'FIXED_OVERRIDE',
          overrideAmountMinor: 17000n,
          justification: 'Catalog fixed override',
          displayOrder: 3,
        },
        {
          proposalRevisionId: revision.id,
          proposalLineId: customLine.id,
          scope: 'CUSTOM_COMPONENT',
          adjustmentType: 'CUSTOM_FIXED_PRICE',
          overrideAmountMinor: 90000n,
          labelFR: 'Prix custom partenaire',
          justification: 'Custom accepted amount',
          displayOrder: 4,
        },
      ],
    });
    const feeLine = revision.lines.find(
      (line) => line.source === 'EXCLUSIVITY_FEE',
    )!;
    await prisma.proposalExclusivity.create({
      data: {
        proposalRevisionId: revision.id,
        territoryType: 'ISO_COUNTRY',
        territoryCode: 'CA',
        territoryLabel: 'Canada',
        startsAt: new Date('2027-01-01T00:00:00Z'),
        hasEconomicImpact: true,
        economicProposalLineId: feeLine.id,
        sectors: {
          create: [
            { sectorCode: 'PUBLIC', sectorLabel: 'Public' },
            { sectorCode: 'INDUSTRIAL', sectorLabel: 'Industriel' },
          ],
        },
        capabilities: { create: [{ capabilityId: capability.id }] },
      },
    });
    await prisma.proposalMinimumCommitment.create({
      data: {
        proposalRevisionId: revision.id,
        type: 'MINIMUM_SITES',
        period: 'YEAR',
        quantity: '50',
        description: '50 sites',
      },
    });
    const economicProjection = {
      select: {
        capabilityId: true,
        componentCode: true,
        pricingModel: true,
        chargeType: true,
        billingPeriod: true,
        metric: true,
        tierMode: true,
        quantity: true,
        quantityUnit: true,
        catalogUnitAmountMinor: true,
        proposedUnitAmountMinor: true,
        catalogExtendedAmountMinor: true,
        proposedExtendedAmountMinor: true,
        calculationStatus: true,
        calculationFormula: true,
        calculationExplanationFR: true,
      },
      orderBy: { displayOrder: 'asc' as const },
    };
    const economicBefore = await prisma.proposalLine.findMany({
      where: { proposalRevisionId: revision.id },
      ...economicProjection,
    });
    await service.setValueAnalysis(
      revision.id,
      {
        mandatesPerYear: '100',
        averageHoursPerMandate: '4',
        billableRateMinorPerHour: '15000',
        productivityGainBasisPoints: 2500,
        disclaimerFR: 'Valeur non contractuelle',
      },
      { userId: actor.id },
    );
    await service.setValueAnalysis(
      revision.id,
      {
        mandatesPerYear: '120',
        averageHoursPerMandate: '5',
        billableRateMinorPerHour: '16000',
        productivityGainBasisPoints: 3000,
        disclaimerFR: 'Valeur recalculée, toujours non contractuelle',
      },
      { userId: actor.id },
    );
    await expect(
      prisma.proposalLine.findMany({
        where: { proposalRevisionId: revision.id },
        ...economicProjection,
      }),
    ).resolves.toEqual(economicBefore);
    await prisma.proposalInput.createMany({
      data: [
        {
          proposalRevisionId: revision.id,
          code: 'DECLARED_VOLUME',
          category: 'QUANTITY',
          valueType: 'INTEGER',
          integerValue: 50n,
          source: 'DECLARED',
          labelFR: 'Volume déclaré',
          displayOrder: 10,
        },
        {
          proposalRevisionId: revision.id,
          code: 'MANUAL_COMPLEXITY',
          category: 'COMPLEXITY',
          valueType: 'DECIMAL',
          decimalValue: '2.5',
          source: 'MANUAL_ASSUMPTION',
          labelFR: 'Complexité estimée',
          justification: 'Hypothèse commerciale documentée',
          displayOrder: 11,
        },
      ],
    });
    const client = await prisma.client.create({
      data: {
        name: `${fixture}_client`,
        organizationId: organization.id,
        regulatoryRequirements: [],
      },
    });
    const building = await prisma.building.create({
      data: {
        name: 'Installation historique',
        address: '1 rue Test',
        city: 'Montréal',
        province: 'QC',
        organizationId: organization.id,
        clientId: client.id,
      },
    });
    const facility = await prisma.rueFacilityProfile.create({
      data: { buildingId: building.id, populationEnabled: true },
    });
    await service.snapshotPopulation(revision.id, facility.id, {
      userId: actor.id,
    });
    const historicalProjection = {
      select: {
        recipientLegalName: true,
        recipientDisplayName: true,
        recipientCountry: true,
        priceBookCodeSnapshot: true,
        priceBookNameSnapshot: true,
        priceBookVersionSnapshot: true,
        contextFR: true,
        termsFR: true,
        inputs: { orderBy: { displayOrder: 'asc' as const } },
        lines: {
          orderBy: { displayOrder: 'asc' as const },
          include: { tiers: { orderBy: { displayOrder: 'asc' as const } } },
        },
      },
    };
    const historicalBefore =
      await prisma.commercialProposalRevision.findUniqueOrThrow({
        where: { id: revision.id },
        ...historicalProjection,
      });
    const document = await prisma.proposalDocument.create({
      data: {
        proposalRevisionId: revision.id,
        type: 'OFFER',
        language: 'FR',
        status: 'FINALIZED',
        fileName: 'offer.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 100,
        storageKey: `${fixture}/offer.pdf`,
        sha256: 'c'.repeat(64),
        templateVersion: 'test/v1',
        generatorVersion: 'test/v1',
        generationKey: `${fixture}:offer`,
        generationStartedAt: new Date(),
        generatedAt: new Date(),
      },
    });
    await prisma.commercialProposalRevision.update({
      where: { id: revision.id },
      data: { status: 'READY', lifecycleReason: 'reviewed', lockVersion: 1 },
    });
    await prisma.commercialProposalRevision.update({
      where: { id: revision.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        sentDocumentId: document.id,
        lifecycleReason: 'sent',
        lockVersion: 2,
      },
    });
    await prisma.commercialProposalRevision.update({
      where: { id: revision.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedByName: 'Authorized Buyer',
        lifecycleReason: 'accepted',
        lockVersion: 3,
      },
    });

    const entitlementScope = { organizationId: organization.id };
    const entitlementCountBefore = await prisma.capabilityEntitlement.count({
      where: entitlementScope,
    });
    const [contract, retry] = await Promise.all([
      service.createContract(
        revision.id,
        {
          reference: `${fixture}_CONTRACT`,
          title: 'Accepted Partner contract',
          reason: 'Accepted proposal conversion test',
        },
        { userId: actor.id },
      ),
      service.createContract(
        revision.id,
        {
          reference: `${fixture}_IGNORED`,
          title: 'Ignored on concurrent retry',
          reason: 'Concurrent idempotency retry',
        },
        { userId: actor.id },
      ),
    ]);
    expect(retry.id).toBe(contract.id);

    const snapshot =
      await prisma.organizationContractRevision.findUniqueOrThrow({
        where: { sourceProposalRevisionId: revision.id },
        include: {
          priceLines: { include: { tiers: true } },
          adjustments: true,
          exclusivities: { include: { sectors: true, capabilities: true } },
          commitments: true,
        },
      });
    const sourceSnapshot =
      await prisma.commercialProposalRevision.findUniqueOrThrow({
        where: { id: revision.id },
        include: {
          lines: { include: { tiers: true } },
          adjustments: true,
          exclusivities: { include: { sectors: true, capabilities: true } },
          commitments: true,
        },
      });
    for (const sourceLine of sourceSnapshot.lines) {
      const contractLine = snapshot.priceLines.find(
        (line) => line.componentCode === sourceLine.componentCode,
      )!;
      expect(contractLine).toMatchObject({
        capabilityId: sourceLine.capabilityId,
        componentCode: sourceLine.componentCode,
        pricingModel: sourceLine.pricingModel,
        chargeType: sourceLine.chargeType,
        billingPeriod: sourceLine.billingPeriod,
        metric: sourceLine.metric,
        tierMode: sourceLine.tierMode,
        quantityUnit: sourceLine.quantityUnit,
        catalogAmountMinor: sourceLine.catalogUnitAmountMinor,
        contractAmountMinor: sourceLine.proposedUnitAmountMinor,
        catalogExtendedAmountMinor: sourceLine.catalogExtendedAmountMinor,
        contractExtendedAmountMinor: sourceLine.proposedExtendedAmountMinor,
        calculationStatus: sourceLine.calculationStatus,
        calculationFormula: sourceLine.calculationFormula,
        calculationExplanation: sourceLine.calculationExplanationFR,
        internalUse: sourceLine.internalUse,
        distributable: sourceLine.distributable,
        distributionMetric: sourceLine.distributionMetric,
      });
      expect(contractLine.quantity?.toString() ?? null).toBe(
        sourceLine.quantity?.toString() ?? null,
      );
      expect(contractLine.distributionLimit?.toString() ?? null).toBe(
        sourceLine.distributionLimit?.toString() ?? null,
      );
      expect(
        contractLine.tiers.map((tier) => ({
          minimumQuantity: tier.minimumQuantity.toString(),
          maximumQuantity: tier.maximumQuantity?.toString() ?? null,
          catalogAmountMinor: tier.catalogAmountMinor,
          contractAmountMinor: tier.contractAmountMinor,
          displayOrder: tier.displayOrder,
        })),
      ).toEqual(
        sourceLine.tiers.map((tier) => ({
          minimumQuantity: tier.minimumQuantity.toString(),
          maximumQuantity: tier.maximumQuantity?.toString() ?? null,
          catalogAmountMinor: tier.amountMinor,
          contractAmountMinor: tier.amountMinor,
          displayOrder: tier.displayOrder,
        })),
      );
    }
    expect(snapshot.adjustments).toHaveLength(4);
    for (const sourceAdjustment of sourceSnapshot.adjustments) {
      const contractAdjustment = snapshot.adjustments.find(
        (adjustment) =>
          adjustment.displayOrder === sourceAdjustment.displayOrder,
      )!;
      const sourceLine = sourceSnapshot.lines.find(
        (line) => line.id === sourceAdjustment.proposalLineId,
      );
      expect(contractAdjustment).toMatchObject({
        scope: sourceAdjustment.scope,
        adjustmentType: sourceAdjustment.adjustmentType,
        sourcePriceComponentId: sourceLine?.sourcePriceComponentId ?? null,
        capabilityId: sourceLine?.capabilityId ?? null,
        code: sourceLine?.componentCode ?? null,
        label: sourceLine?.componentNameFR ?? null,
        discountBasisPoints: sourceAdjustment.discountBasisPoints,
        overrideAmountMinor: sourceAdjustment.overrideAmountMinor,
        justification: sourceAdjustment.justification,
        displayOrder: sourceAdjustment.displayOrder,
      });
    }
    const sentinelleLine = snapshot.priceLines.find(
      (line) => line.componentCode === `${fixture}_SENTINELLE`,
    )!;
    expect(sentinelleLine.internalUse).toBe(false);
    expect(sentinelleLine.distributable).toBe(true);
    expect(sentinelleLine.distributionLimit?.toString()).toBe('50');
    expect(sentinelleLine.distributionMetric).toBe('SITE');
    expect(sentinelleLine.quantity?.toString()).toBe('50');
    expect(sentinelleLine.contractExtendedAmountMinor).toBe(90000n);
    expect(snapshot.exclusivities).toHaveLength(1);
    expect(snapshot.exclusivities[0].sectors).toHaveLength(2);
    expect(snapshot.exclusivities[0].capabilities[0].capabilityId).toBe(
      capability.id,
    );
    expect(snapshot.exclusivities[0].economicSnapshotLineId).toBe(
      snapshot.priceLines.find(
        (line) => line.componentCode === `${fixture}_EXCLUSIVITY`,
      )!.id,
    );
    expect(snapshot.exclusivities[0]).toMatchObject({
      territoryType: sourceSnapshot.exclusivities[0].territoryType,
      territoryCode: sourceSnapshot.exclusivities[0].territoryCode,
      territoryLabel: sourceSnapshot.exclusivities[0].territoryLabel,
      startsAt: sourceSnapshot.exclusivities[0].startsAt,
      endsAt: sourceSnapshot.exclusivities[0].endsAt,
      conditions: sourceSnapshot.exclusivities[0].conditions,
      renewalTerms: sourceSnapshot.exclusivities[0].renewalTerms,
      hasEconomicImpact: true,
    });
    expect(snapshot.commitments).toHaveLength(1);
    expect(snapshot.commitments[0]).toMatchObject({
      type: sourceSnapshot.commitments[0].type,
      period: sourceSnapshot.commitments[0].period,
      amountMinor: sourceSnapshot.commitments[0].amountMinor,
      quantity: sourceSnapshot.commitments[0].quantity,
      currency: sourceSnapshot.commitments[0].currency,
      unit: sourceSnapshot.commitments[0].unit,
      description: sourceSnapshot.commitments[0].description,
    });
    await prisma.organization.update({
      where: { id: organization.id },
      data: { name: `${fixture}_organization_changed` },
    });
    await prisma.priceBook.update({
      where: { id: priceBook.id },
      data: { name: `${fixture}_pricebook_changed` },
    });
    await prisma.priceComponent.update({
      where: { id: catalogComponent.id },
      data: { nameFr: 'Catalogue source modifié' },
    });
    await prisma.building.update({
      where: { id: building.id },
      data: { name: 'Installation source modifiée', city: 'Québec' },
    });
    await prisma.rueFacilityProfile.update({
      where: { id: facility.id },
      data: { populationEnabled: false },
    });
    await expect(
      prisma.commercialProposalRevision.findUniqueOrThrow({
        where: { id: revision.id },
        ...historicalProjection,
      }),
    ).resolves.toEqual(historicalBefore);

    const prospect = await prisma.commercialProspect.create({
      data: {
        reference: `${fixture}_historical_prospect`,
        legalName: 'Prospect historique',
        displayName: 'Prospect historique',
        preferredLanguage: 'FR',
        country: 'CA',
      },
    });
    const prospectProposal = await prisma.commercialProposal.create({
      data: {
        reference: `${fixture}_prospect_proposal`,
        title: 'Prospect snapshot',
        prospectId: prospect.id,
      },
    });
    const prospectRevision = await prisma.commercialProposalRevision.create({
      data: {
        proposalId: prospectProposal.id,
        revisionNumber: 1,
        relationshipSnapshot: 'DIRECT',
        currency: 'CAD',
        recipientLegalName: prospect.legalName,
        recipientDisplayName: prospect.displayName,
        recipientCountry: prospect.country,
        recipientPreferredLanguage: prospect.preferredLanguage,
        calculationVersion: 'proposal-pricing/v1',
      },
    });
    await prisma.commercialProposalRevision.update({
      where: { id: prospectRevision.id },
      data: { status: 'READY', lockVersion: 1 },
    });
    await prisma.commercialProspect.update({
      where: { id: prospect.id },
      data: {
        legalName: 'Prospect source modifié',
        lockVersion: { increment: 1 },
      },
    });
    await expect(
      prisma.commercialProposalRevision.findUniqueOrThrow({
        where: { id: prospectRevision.id },
        select: { recipientLegalName: true, recipientDisplayName: true },
      }),
    ).resolves.toEqual({
      recipientLegalName: 'Prospect historique',
      recipientDisplayName: 'Prospect historique',
    });
    await expect(
      prisma.capabilityEntitlement.count({ where: entitlementScope }),
    ).resolves.toBe(entitlementCountBefore);
  });
});
