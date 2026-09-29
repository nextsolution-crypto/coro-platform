import { CommercialProposalRevisionStatus, PrismaClient } from '@prisma/client';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const states: CommercialProposalRevisionStatus[] = [
  'DRAFT',
  'INTERNAL_REVIEW',
  'READY',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'SUPERSEDED',
  'CANCELLED',
];

describeDatabase('Phase 2D proposal lifecycle DB matrix', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  const fixture = `p2d_lifecycle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  afterAll(async () => prisma.$disconnect());

  async function revisionAt(status: CommercialProposalRevisionStatus) {
    const organization = await prisma.organization.create({
      data: { name: `${fixture}_${status}` },
    });
    const proposal = await prisma.commercialProposal.create({
      data: {
        reference: `${fixture}_${status}`,
        title: status,
        organizationId: organization.id,
      },
    });
    const revision = await prisma.commercialProposalRevision.create({
      data: {
        proposalId: proposal.id,
        revisionNumber: 1,
        relationshipSnapshot: 'DIRECT',
        currency: 'CAD',
        recipientLegalName: status,
        recipientDisplayName: status,
        recipientCountry: 'CA',
        recipientPreferredLanguage: 'FR',
        calculationVersion: 'proposal-pricing/v1',
        lines: {
          create: {
            source: 'CUSTOM_COMPONENT',
            componentCode: `${fixture}_${status}_LINE`,
            componentNameFR: status,
            pricingModel: 'CUSTOM',
            chargeType: 'ONE_TIME',
            proposedUnitAmountMinor: 100n,
            proposedExtendedAmountMinor: 100n,
            calculationStatus: 'MANUAL',
            calculationExplanationFR: 'Fixture',
            displayOrder: 1,
          },
        },
      },
      include: { lines: true },
    });
    if (status === 'DRAFT') return revision;
    let sentDocumentId: string | undefined;
    if (status === 'ACCEPTED') {
      const document = await prisma.proposalDocument.create({
        data: {
          proposalRevisionId: revision.id,
          type: 'OFFER',
          language: 'FR',
          status: 'FINALIZED',
          fileName: `${status}.pdf`,
          mimeType: 'application/pdf',
          sizeBytes: 1,
          storageKey: `${fixture}/${status}.pdf`,
          sha256: 'f'.repeat(64),
          templateVersion: 'test/v1',
          generatorVersion: 'test/v1',
          generationKey: `${fixture}:${status}`,
          generationStartedAt: new Date(),
          generatedAt: new Date(),
        },
      });
      sentDocumentId = document.id;
    }
    return prisma.commercialProposalRevision.update({
      where: { id: revision.id },
      data: {
        status,
        lockVersion: 1,
        lifecycleReason: 'DB lifecycle fixture',
        ...(status === 'ACCEPTED'
          ? {
              acceptedAt: new Date(),
              acceptedByName: 'Buyer',
              sentDocumentId,
            }
          : {}),
      },
      include: { lines: true },
    });
  }

  it.each(states)(
    'enforces content and deletion policy in %s',
    async (status) => {
      const revision = await revisionAt(status);
      if (status === 'DRAFT') {
        await expect(
          prisma.proposalLine.update({
            where: { id: revision.lines[0].id },
            data: { componentNameFR: 'DRAFT remains editable' },
          }),
        ).resolves.toBeDefined();
        await expect(
          prisma.commercialProposalRevision.update({
            where: { id: revision.id },
            data: {
              internalNotes: 'DRAFT remains editable',
              lockVersion: { increment: 1 },
            },
          }),
        ).resolves.toBeDefined();
      } else {
        await expect(
          prisma.proposalLine.update({
            where: { id: revision.lines[0].id },
            data: { componentNameFR: 'Forbidden mutation' },
          }),
        ).rejects.toThrow();
        await expect(
          prisma.commercialProposalRevision.update({
            where: { id: revision.id },
            data: {
              internalNotes: 'Forbidden content mutation',
              lockVersion: { increment: 1 },
            },
          }),
        ).rejects.toThrow();
      }
      await expect(
        prisma.commercialProposalRevision.delete({
          where: { id: revision.id },
        }),
      ).rejects.toThrow();
    },
  );
});
