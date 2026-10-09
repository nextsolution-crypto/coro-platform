import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { CommercialDossierTargetType } from '../src/commercial-proposals/commercial-dossier.dto';
import { CommercialDossierService } from '../src/commercial-proposals/commercial-dossier.service';

const url = process.env.TEST_DATABASE_URL;
const describeDb = url ? describe : describe.skip;

describeDb('Unified commercial dossier PostgreSQL read model', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const service = new CommercialDossierService(
    prisma as unknown as PrismaService,
  );
  const suffix = `dossier_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let prospectId = '';
  let proposalId = '';

  beforeAll(async () => {
    const prospect = await prisma.commercialProspect.create({
      data: {
        reference: suffix,
        legalName: 'Dossier Test Inc.',
        displayName: 'Dossier Test',
        country: 'CA',
      },
    });
    prospectId = prospect.id;
    const proposal = await prisma.commercialProposal.create({
      data: {
        reference: `${suffix}_proposal`,
        title: 'Direct historical proposal',
        prospectId,
      },
    });
    proposalId = proposal.id;
    await prisma.commercialProposalRevision.create({
      data: {
        proposalId,
        revisionNumber: 1,
        relationshipSnapshot: 'DIRECT',
        currency: 'CAD',
        recipientLegalName: 'Dossier Test Inc.',
        recipientDisplayName: 'Dossier Test',
        recipientCountry: 'CA',
        recipientPreferredLanguage: 'FR',
        calculationVersion: 'dossier-test/v1',
        oneTimeTotalMinor: 742500n,
        annualRecurringEquivalentMinor: 1750000n,
        firstYearCommitmentMinor: 2492500n,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('recovers a direct Proposal and performs zero writes', async () => {
    const before = await Promise.all([
      prisma.commercialProspect.count(),
      prisma.commercialProposal.count(),
      prisma.commercialProposalRevision.count(),
      prisma.organizationContract.count(),
      prisma.capabilityEntitlement.count(),
      prisma.adminAuditEvent.count(),
    ]);

    const dossier = await service.get(
      CommercialDossierTargetType.PROSPECT,
      prospectId,
    );

    const after = await Promise.all([
      prisma.commercialProspect.count(),
      prisma.commercialProposal.count(),
      prisma.commercialProposalRevision.count(),
      prisma.organizationContract.count(),
      prisma.capabilityEntitlement.count(),
      prisma.adminAuditEvent.count(),
    ]);
    expect(after).toEqual(before);
    expect(dossier.proposals).toHaveLength(1);
    expect(dossier.proposals[0]).toMatchObject({
      id: proposalId,
      source: 'DIRECT',
      latestRevision: {
        totals: {
          oneTimeMinor: '742500',
          annualRecurringMinor: '1750000',
          firstYearMinor: '2492500',
        },
      },
    });
    expect(dossier.entitlementSummary).toMatchObject({
      present: false,
      inferred: false,
    });
    expect(() => JSON.stringify(dossier)).not.toThrow();
  });
});
