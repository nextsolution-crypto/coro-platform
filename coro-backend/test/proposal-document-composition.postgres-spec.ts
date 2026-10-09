import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { CommercialClauseService } from '../src/commercial-clauses/commercial-clause.service';
import { CommercialContentService } from '../src/commercial-content/commercial-content.service';
import { ProposalDocumentCompositionService } from '../src/proposal-document-composition/proposal-document-composition.service';

const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error(
    'TEST_DATABASE_URL jetable est obligatoire pour proposal-document-composition.postgres-spec',
  );

describe('Proposal document composition PostgreSQL invariants', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const audit = new AdminAuditService();
  const service = new ProposalDocumentCompositionService(
    prisma as never,
    audit,
  );
  const contentService = new CommercialContentService(prisma as never, audit);
  const clauseService = new CommercialClauseService(prisma as never, audit);
  const suffix = randomUUID().replace(/-/g, '');
  let actor = { userId: '' };
  let organizationId = '';
  let proposalId = '';
  let revisionId = '';

  beforeAll(async () => {
    const organization = await prisma.organization.create({
      data: { name: `composition_${suffix}` },
    });
    organizationId = organization.id;
    actor = {
      userId: (
        await prisma.user.create({
          data: {
            email: `composition_${suffix}@example.test`,
            password: 'test-only',
            firstName: 'Document',
            lastName: 'Composer',
            role: 'SUPER_ADMIN',
            organizationId: organization.id,
          },
        })
      ).id,
    };
    const proposal = await prisma.commercialProposal.create({
      data: {
        reference: `DOC-${suffix}`,
        title: 'Professional document composition fixture',
        organizationId: organization.id,
        createdByUserId: actor.userId,
      },
    });
    proposalId = proposal.id;
    const revision = await prisma.commercialProposalRevision.create({
      data: {
        proposalId,
        revisionNumber: 1,
        relationshipSnapshot: 'DIRECT',
        currency: 'CAD',
        recipientLegalName: 'Client Document Test',
        recipientDisplayName: 'Client Document',
        recipientEmail: 'client@example.test',
        recipientCountry: 'CA',
        recipientPreferredLanguage: 'FR',
        contextFR: 'Contexte approuve pour le test.',
        contextEN: 'Approved test context.',
        oneTimeTotalMinor: 742500n,
        recurringAnnualCadenceMinor: 1750000n,
        annualRecurringEquivalentMinor: 1750000n,
        firstYearCommitmentMinor: 2492500n,
        calculationVersion: 'proposal-pricing/v2',
        calculatedAt: new Date(),
        createdByUserId: actor.userId,
        lines: {
          create: [
            {
              source: 'CUSTOM_COMPONENT',
              componentCode: `PROFESSIONAL_ANNUAL_${suffix}`,
              componentNameFR: 'CORO Professional annuel',
              componentNameEN: 'CORO Professional annual',
              pricingModel: 'CAPACITY_BAND',
              chargeType: 'RECURRING',
              revenueCategory: 'SAAS',
              billingPeriod: 'YEAR',
              metric: 'SITE',
              quantity: '125',
              quantityUnit: 'SITE',
              proposedUnitAmountMinor: 1750000n,
              proposedExtendedAmountMinor: 1750000n,
              calculationStatus: 'CALCULATED',
              calculationExplanationFR: 'Palier approuve.',
              displayOrder: 0,
            },
            {
              source: 'CUSTOM_COMPONENT',
              componentCode: `IMPLEMENTATION_${suffix}`,
              componentNameFR: 'Implementation avancee',
              componentNameEN: 'Advanced implementation',
              pricingModel: 'FLAT',
              chargeType: 'ONE_TIME',
              revenueCategory: 'IMPLEMENTATION',
              metric: 'FIXED',
              quantity: '1',
              quantityUnit: 'FIXED',
              proposedUnitAmountMinor: 742500n,
              proposedExtendedAmountMinor: 742500n,
              calculationStatus: 'CALCULATED',
              calculationExplanationFR: 'Forfait approuve.',
              displayOrder: 1,
            },
          ],
        },
        inputs: {
          create: {
            code: 'ACTIVE_SITES',
            category: 'QUANTITY',
            valueType: 'DECIMAL',
            decimalValue: '125',
            unit: 'SITE',
            source: 'DECLARED',
            labelFR: 'Sites actifs',
            labelEN: 'Active sites',
            displayOrder: 0,
          },
        },
      },
    });
    revisionId = revision.id;
  });

  afterAll(async () => prisma.$disconnect());

  async function ensureApprovedProfessionalContent() {
    const existing = await prisma.commercialContent.findUnique({
      where: { code: 'CORO_PROFESSIONAL' },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: { bindings: { orderBy: { displayOrder: 'asc' } } },
        },
      },
    });
    if (existing?.versions.some(({ status }) => status === 'APPROVED')) return;
    if (!existing) await contentService.createProfessionalDraft(actor);
    const detail = await contentService.detail('CORO_PROFESSIONAL');
    const draft = detail.versions.find(({ status }) => status === 'DRAFT');
    if (!draft) throw new Error('Professional content DRAFT unavailable');
    const updated = await contentService.updateDraft(
      draft.id,
      {
        lockVersion: draft.lockVersion,
        titleFR: draft.titleFR,
        titleEN: draft.titleEN ?? 'CORO Professional',
        descriptionFR: draft.descriptionFR,
        descriptionEN:
          draft.descriptionEN ?? 'Approved Professional commercial content.',
        provenance: draft.provenance,
        bindings: draft.bindings.map((binding) => ({
          targetType: binding.targetType,
          targetCode: binding.targetCode,
          labelFR: binding.labelFR,
          labelEN: binding.labelEN ?? `${binding.labelFR} (EN)`,
          commercialIntent: binding.commercialIntent,
          deliveryMaturity:
            binding.deliveryMaturity === 'UNVERIFIED'
              ? ('LIMITED' as const)
              : binding.deliveryMaturity,
          evidence: binding.evidence ?? undefined,
          displayOrder: binding.displayOrder,
        })),
      },
      actor,
    );
    const review = await contentService.submit(
      updated.id,
      { lockVersion: updated.lockVersion, reason: 'C01 fixture review' },
      actor,
    );
    await contentService.approve(
      review.id,
      { lockVersion: review.lockVersion, reason: 'C01 fixture approval' },
      actor,
    );
  }

  async function createApprovedClauses() {
    const categories = [
      'OFFER_VALIDITY',
      'CURRENCY_AND_TAXES',
      'PAYMENT_TERMS',
      'SAAS_SUBSCRIPTION',
      'DATA_PROTECTION',
      'LIABILITY',
      'GOVERNING_LAW',
      'ACCEPTANCE',
    ] as const;
    for (const category of categories) {
      const clause = await prisma.commercialClause.create({
        data: {
          code: `C01_${category}_${suffix}`,
          category,
          versions: {
            create: {
              versionNumber: 1,
              titleFR: `Clause ${category}`,
              titleEN: `${category} clause`,
              textFR: `Texte approuve ${category}.`,
              textEN: `Approved ${category} text.`,
              provenance: 'C01_TEST_FIXTURE',
              parameterSchema: [],
              contentHash: '0'.repeat(64),
              createdByUserId: actor.userId,
            },
          },
        },
        include: { versions: true },
      });
      const draft = clause.versions[0];
      const updated = await clauseService.updateDraft(
        draft.id,
        {
          lockVersion: draft.lockVersion,
          titleFR: draft.titleFR,
          titleEN: draft.titleEN,
          textFR: draft.textFR,
          textEN: draft.textEN,
          businessOwner: 'Commercial',
          legalOwner: 'Legal',
          isRequired: true,
          provenance: draft.provenance,
          applicabilities: ['CORO_PROFESSIONAL'],
          parameters:
            category === 'OFFER_VALIDITY'
              ? [
                  {
                    key: 'offerValidityDays',
                    type: 'DURATION_DAYS',
                    required: true,
                  },
                ]
              : [],
        },
        actor,
      );
      const review = await clauseService.submit(
        updated.id,
        { lockVersion: updated.lockVersion, reason: 'C01 business review' },
        actor,
      );
      const legal = await clauseService.recordLegalReview(
        review.id,
        {
          lockVersion: review.lockVersion,
          reason: 'C01 legal review',
          evidence: `C01-EVIDENCE-${category}`,
        },
        actor,
      );
      await clauseService.approve(
        legal.id,
        { lockVersion: legal.lockVersion, reason: 'C01 approval' },
        actor,
      );
    }
  }

  async function attachFamilyAndVerifiedIssuer() {
    const book = await prisma.priceBook.create({
      data: {
        code: `C01_${suffix}`,
        name: 'C01 fixture',
        audience: 'DIRECT',
        currency: 'CAD',
      },
    });
    const priceBookVersion = await prisma.priceBookVersion.create({
      data: {
        priceBookId: book.id,
        versionNumber: 1,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
    const workspace = await prisma.commercialSimulationWorkspace.create({
      data: {
        reference: `C01-WS-${suffix}`,
        title: 'C01 composition fixture',
        organizationId,
        priceBookVersionId: priceBookVersion.id,
        currency: 'CAD',
      },
    });
    const scenario = await prisma.commercialSimulationScenario.create({
      data: {
        workspaceId: workspace.id,
        name: 'Professional',
        families: { create: { familyCode: 'PROFESSIONAL' } },
      },
    });
    const run = await prisma.commercialSimulationCalculationRun.create({
      data: {
        scenarioId: scenario.id,
        workspaceId: workspace.id,
        priceBookVersionId: priceBookVersion.id,
        sequence: 1,
        calculationKey: '1'.repeat(64),
        fingerprintVersion: 'simulator-input/v4',
        inputFingerprint: '2'.repeat(64),
        workspaceLockVersion: 0,
        scenarioLockVersion: 0,
        currency: 'CAD',
        pricingMethodologyCode: 'proposal-pricing',
        pricingMethodologyVersion: 'v2',
        priceStatus: 'COMPLETE',
        costStatus: 'UNAVAILABLE',
        valueStatus: 'NOT_APPLICABLE',
      },
    });
    await prisma.commercialSimulationProposalConversion.create({
      data: {
        workspaceId: workspace.id,
        scenarioId: scenario.id,
        calculationRunId: run.id,
        proposalId,
        proposalRevisionId: revisionId,
        convertedByUserId: actor.userId,
      },
    });
    const issuer = await prisma.commercialLegalIssuer.create({
      data: {
        code: `C01_ISSUER_${suffix}`,
        versions: {
          create: {
            versionNumber: 1,
            status: 'VERIFIED',
            legalName: 'CORO Test Legal Issuer',
            tradeName: 'CORO',
            legalForm: 'Test fixture',
            country: 'CA',
            subdivision: 'QC',
            addressLine1: '100 rue Test',
            city: 'Montreal',
            postalCode: 'H0H 0H0',
            officialEmail: 'legal@example.test',
            businessNumberApplicability: 'NOT_APPLICABLE',
            federalTaxApplicability: 'NOT_APPLICABLE',
            provincialTaxApplicability: 'NOT_APPLICABLE',
            referenceCurrency: 'CAD',
            provenance: 'C01_TEST_FIXTURE',
            contentHash: '3'.repeat(64),
            createdByUserId: actor.userId,
            verifiedByUserId: actor.userId,
            verifiedAt: new Date(),
          },
        },
      },
      include: { versions: true },
    });
    const version = issuer.versions[0];
    await prisma.commercialLegalIssuerSnapshot.create({
      data: {
        proposalRevisionId: revisionId,
        legalIssuerVersionId: version.id,
        issuerCode: issuer.code,
        issuerVersionNumber: 1,
        legalName: version.legalName,
        tradeName: version.tradeName,
        legalForm: version.legalForm,
        country: version.country,
        subdivision: version.subdivision,
        addressLine1: version.addressLine1,
        city: version.city,
        postalCode: version.postalCode,
        officialEmail: version.officialEmail,
        businessNumberApplicability: 'NOT_APPLICABLE',
        federalTaxApplicability: 'NOT_APPLICABLE',
        provincialTaxApplicability: 'NOT_APPLICABLE',
        referenceCurrency: 'CAD',
        snapshotHash: '4'.repeat(64),
        capturedByUserId: actor.userId,
      },
    });
  }

  it('persists a deterministic internal draft when authorities are missing', async () => {
    const dto = {
      templateCode: 'CORO_PROFESSIONAL' as const,
      language: 'FR' as const,
    };
    const first = await service.composeInternalDraft(
      proposalId,
      revisionId,
      dto,
      actor,
    );
    const repeated = await service.composeInternalDraft(
      proposalId,
      revisionId,
      dto,
      actor,
    );
    expect(first.id).toBe(repeated.id);
    expect(first.canonicalHash).toBe(repeated.canonicalHash);
    expect(first.readiness).toBe('INTERNAL_DRAFT');
    expect(first.issuanceReady).toBe(false);
    expect(JSON.stringify(first.diagnostics)).toContain(
      'FAMILY_AUTHORITY_MISSING',
    );
    await expect(
      prisma.proposalDocumentCompositionSnapshot.update({
        where: { id: first.id },
        data: { sequence: 99 },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.proposalDocumentCompositionSnapshot.delete({
        where: { id: first.id },
      }),
    ).rejects.toThrow();
  });

  it('composes Professional FR/EN with exact customer-safe economics and no side effects', async () => {
    await ensureApprovedProfessionalContent();
    await createApprovedClauses();
    await attachFamilyAndVerifiedIssuer();
    const sideEffectsBefore = {
      documents: await prisma.proposalDocument.count(),
      contracts: await prisma.organizationContract.count(),
      entitlements: await prisma.capabilityEntitlement.count(),
    };
    const missingParameter = await service.composeInternalDraft(
      proposalId,
      revisionId,
      { templateCode: 'CORO_PROFESSIONAL', language: 'FR' },
      actor,
    );
    expect(missingParameter.issuanceReady).toBe(false);
    expect(JSON.stringify(missingParameter.diagnostics)).toContain(
      'REQUIRED_CLAUSE_PARAMETER_MISSING',
    );
    const dto = {
      templateCode: 'CORO_PROFESSIONAL' as const,
      language: 'FR' as const,
      clauseParameters: { offerValidityDays: 30 },
    };
    const [first, repeated] = await Promise.all([
      service.composeInternalDraft(proposalId, revisionId, dto, actor),
      service.composeInternalDraft(proposalId, revisionId, dto, actor),
    ]);
    expect(first.id).toBe(repeated.id);
    expect(first.issuanceReady).toBe(true);
    expect(first.readiness).toBe('ISSUANCE_READY');
    const snapshot = first.snapshot as Record<string, unknown>;
    const serialized = JSON.stringify(snapshot);
    expect(snapshot.familyCodes).toEqual(['PROFESSIONAL']);
    expect(snapshot.economics).toMatchObject({
      currency: 'CAD',
      totals: {
        oneTimeMinor: '742500',
        annualRecurringMinor: '1750000',
        firstYearMinor: '2492500',
      },
    });
    expect(serialized).not.toMatch(
      /estimatedCost|margin|contribution|loadedEffort|priceBookId|runId|internalNotes/i,
    );
    const english = await service.composeInternalDraft(
      proposalId,
      revisionId,
      {
        ...dto,
        language: 'EN',
      },
      actor,
    );
    expect(english.issuanceReady).toBe(true);
    await expect(
      service.composeInternalDraft(
        proposalId,
        revisionId,
        {
          ...dto,
          clauseParameters: { offerValidityDays: -1 },
        },
        actor,
      ),
    ).rejects.toThrow('INVALID_CLAUSE_PARAMETER');
    await expect(
      service.composeInternalDraft(
        proposalId,
        revisionId,
        {
          ...dto,
          clauseParameters: { invented: 1 },
        },
        actor,
      ),
    ).rejects.toThrow('UNKNOWN_CLAUSE_PARAMETERS');
    expect({
      documents: await prisma.proposalDocument.count(),
      contracts: await prisma.organizationContract.count(),
      entitlements: await prisma.capabilityEntitlement.count(),
    }).toEqual(sideEffectsBefore);
    expect(
      await prisma.adminAuditEvent.count({
        where: {
          action: 'PROPOSAL_DOCUMENT_COMPOSITION_CAPTURED',
          actorUserId: actor.userId,
        },
      }),
    ).toBe(4);
  });
});
