import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommercialDossierTargetType } from './commercial-dossier.dto';
import { CommercialDossierService } from './commercial-dossier.service';

const date = new Date('2026-10-09T12:00:00.000Z');

describe('CommercialDossierService', () => {
  const prisma = {
    commercialProspect: { findUnique: jest.fn() },
    organization: { findUnique: jest.fn() },
    commercialSimulationWorkspace: { findMany: jest.fn() },
    commercialProposal: { findMany: jest.fn() },
    organizationContract: { findMany: jest.fn() },
    capabilityEntitlement: { findMany: jest.fn() },
  };
  const service = new CommercialDossierService(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.commercialSimulationWorkspace.findMany.mockResolvedValue([]);
    prisma.commercialProposal.findMany.mockResolvedValue([]);
    prisma.organizationContract.findMany.mockResolvedValue([]);
    prisma.capabilityEntitlement.findMany.mockResolvedValue([]);
  });

  it('isolates an explicit prospect and returns JSON-safe observed evidence', async () => {
    prisma.commercialProspect.findUnique.mockResolvedValue({
      id: 'prospect-a',
      reference: 'PROS-A',
      displayName: 'Prospect A',
      legalName: 'Prospect A Inc.',
      status: 'ACTIVE',
      convertedOrganizationId: null,
    });
    prisma.commercialSimulationWorkspace.findMany.mockResolvedValue([
      {
        id: 'workspace-a',
        reference: 'CFG-A',
        title: 'Configuration A',
        status: 'ACTIVE',
        selectedScenarioId: 'scenario-a',
        createdAt: date,
        updatedAt: date,
        scenarios: [
          {
            id: 'scenario-a',
            name: 'Standard',
            status: 'ACTIVE',
            lockVersion: 4,
            displayOrder: 1,
            families: [{ familyCode: 'CORO_PROFESSIONAL' }],
            runs: [
              {
                id: 'run-a',
                scenarioLockVersion: 4,
                priceStatus: 'COMPLETE',
                calculatedAt: date,
                priceResult: {
                  oneTimeTotalMinor: 742500n,
                  annualRecurringEquivalentMinor: 1750000n,
                  firstYearCommitmentMinor: 2492500n,
                },
                conversion: null,
              },
            ],
          },
        ],
      },
    ]);

    const result = await service.get(
      CommercialDossierTargetType.PROSPECT,
      'prospect-a',
    );

    expect(prisma.commercialProspect.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'prospect-a' } }),
    );
    expect(prisma.commercialSimulationWorkspace.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { prospectId: 'prospect-a' } }),
    );
    expect(prisma.commercialProposal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { prospectId: 'prospect-a' } }),
    );
    expect(prisma.organizationContract.findMany).not.toHaveBeenCalled();
    expect(result.observationOnly).toBe(true);
    expect(result.workspaces[0].scenarios[0].currentOfficialRun).toMatchObject({
      current: true,
      totals: {
        oneTimeMinor: '742500',
        annualRecurringMinor: '1750000',
        firstYearMinor: '2492500',
      },
    });
    expect(result.nextActions).toEqual([
      expect.objectContaining({ code: 'CREATE_PROPOSAL' }),
    ]);
    expect(() => JSON.stringify(result)).not.toThrow();
    expect(JSON.stringify(result)).not.toMatch(
      /firstYearCost|margin|internalNotes|snapshotHash/,
    );
  });

  it('does not infer entitlements for a prospect', async () => {
    prisma.commercialProspect.findUnique.mockResolvedValue({
      id: 'prospect-a',
      reference: 'PROS-A',
      displayName: 'Prospect A',
      legalName: 'Prospect A Inc.',
      status: 'ACTIVE',
      convertedOrganizationId: null,
    });

    const result = await service.get(
      CommercialDossierTargetType.PROSPECT,
      'prospect-a',
    );

    expect(prisma.capabilityEntitlement.findMany).not.toHaveBeenCalled();
    expect(result.entitlementSummary).toEqual({
      present: false,
      count: 0,
      items: [],
      inferred: false,
    });
  });

  it('keeps multiple workspaces distinct and offers a choice instead of arbitrary authority', async () => {
    prisma.commercialProspect.findUnique.mockResolvedValue({
      id: 'prospect-a',
      reference: 'PROS-A',
      displayName: 'Prospect A',
      legalName: 'Prospect A Inc.',
      status: 'ACTIVE',
      convertedOrganizationId: null,
    });
    prisma.commercialSimulationWorkspace.findMany.mockResolvedValue([
      {
        id: 'workspace-new',
        reference: 'CFG-NEW',
        title: 'Configuration récente',
        status: 'ACTIVE',
        selectedScenarioId: null,
        createdAt: date,
        updatedAt: date,
        scenarios: [],
      },
      {
        id: 'workspace-old',
        reference: 'CFG-OLD',
        title: 'Configuration historique',
        status: 'ACTIVE',
        selectedScenarioId: null,
        createdAt: date,
        updatedAt: new Date('2026-10-08T12:00:00.000Z'),
        scenarios: [],
      },
    ]);

    const result = await service.get(
      CommercialDossierTargetType.PROSPECT,
      'prospect-a',
    );

    expect(result.workspaces.map((workspace) => workspace.id)).toEqual([
      'workspace-new',
      'workspace-old',
    ]);
    expect(result.nextActions).toEqual([
      {
        code: 'RESUME_CONFIGURATION_workspace-new',
        label: 'Reprendre Configuration récente',
        href: '/admin/commercial/configurator?workspaceId=workspace-new',
      },
      {
        code: 'RESUME_CONFIGURATION_workspace-old',
        label: 'Reprendre Configuration historique',
        href: '/admin/commercial/configurator?workspaceId=workspace-old',
      },
    ]);
  });

  it('distinguishes direct proposals, composition readiness and historical PDF V3', async () => {
    prisma.commercialProspect.findUnique.mockResolvedValue({
      id: 'prospect-a',
      reference: 'PROS-A',
      displayName: 'Prospect A',
      legalName: 'Prospect A Inc.',
      status: 'ACTIVE',
      convertedOrganizationId: null,
    });
    prisma.commercialProposal.findMany.mockResolvedValue([
      {
        id: 'proposal-a',
        reference: 'PROP-A',
        title: 'Proposal A',
        status: 'OPEN',
        organizationId: null,
        prospectId: 'prospect-a',
        acceptedRevisionId: null,
        createdAt: date,
        updatedAt: date,
        simulationConversion: null,
        revisions: [
          {
            id: 'revision-a',
            revisionNumber: 1,
            status: 'DRAFT',
            validFrom: null,
            validUntil: null,
            oneTimeTotalMinor: 742500n,
            annualRecurringEquivalentMinor: 1750000n,
            firstYearCommitmentMinor: 2492500n,
            documentCompositions: [
              {
                id: 'composition-a',
                templateCode: 'CORO_PROFESSIONAL',
                language: 'FR',
                readiness: 'INTERNAL_DRAFT',
                issuanceReady: false,
                composedAt: date,
              },
            ],
            documents: [
              {
                id: 'document-a',
                type: 'OFFER',
                language: 'FR',
                artifactVersion: 1,
                status: 'FINALIZED',
                fileName: 'historical.pdf',
                templateVersion: 'proposal-offer/v3',
                generatorVersion: 'puppeteer/v1',
                compositionReadiness: null,
                generatedAt: date,
              },
            ],
            sourceContractRevision: null,
          },
        ],
      },
    ]);

    const result = await service.get(
      CommercialDossierTargetType.PROSPECT,
      'prospect-a',
    );

    expect(result.proposals[0]).toMatchObject({
      source: 'DIRECT',
      latestRevision: {
        documentReadiness: 'INTERNAL_DRAFT',
        documents: [
          {
            documentKind: 'HISTORICAL_PDF_V3',
            downloadUrl:
              '/admin/v1/commercial/proposals/proposal-a/revisions/revision-a/documents/document-a/download',
          },
        ],
      },
    });
  });

  it('reports only explicit organization contracts and entitlements', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      id: 'organization-a',
      name: 'Organization A',
      isActive: true,
    });
    prisma.organizationContract.findMany.mockResolvedValue([
      {
        id: 'contract-a',
        reference: 'CTR-A',
        title: 'Contract A',
        status: 'ACTIVE',
        isPrimary: true,
        updatedAt: date,
        revisions: [],
      },
    ]);
    prisma.capabilityEntitlement.findMany.mockResolvedValue([
      {
        id: 'entitlement-a',
        source: 'CONTRACT',
        scope: 'ORGANIZATION',
        sourceContractId: 'contract-a',
        capability: {
          code: 'COMPLIANCE_OPERATIONS',
          nameFr: 'Conformité',
        },
        revisions: [
          {
            versionNumber: 1,
            lifecycle: 'ACTIVE',
            enabled: true,
            distributable: false,
            effectiveFrom: date,
            effectiveUntil: null,
          },
        ],
      },
    ]);

    const result = await service.get(
      CommercialDossierTargetType.ORGANIZATION,
      'organization-a',
    );

    expect(prisma.organizationContract.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'organization-a' } }),
    );
    expect(prisma.capabilityEntitlement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'organization-a' } }),
    );
    expect(result.contracts).toHaveLength(1);
    expect(result.entitlementSummary).toMatchObject({
      present: true,
      count: 1,
      inferred: false,
    });
  });

  it('rejects an unknown explicit target', async () => {
    prisma.organization.findUnique.mockResolvedValue(null);
    await expect(
      service.get(CommercialDossierTargetType.ORGANIZATION, 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
