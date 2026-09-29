import { PrismaClient } from '@prisma/client';
const url = process.env.TEST_DATABASE_URL;
const describeDb = url ? describe : describe.skip;
describeDb('Phase 2D commercial proposals PostgreSQL invariants', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const s = `p2d_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  afterAll(async () => prisma.$disconnect());
  it('migration created no Phase 2D rows and no entitlements', async () => {
    const [m] = await prisma.$queryRaw<
      Array<{ startedAt: Date; finishedAt: Date }>
    >`SELECT started_at AS "startedAt", finished_at AS "finishedAt" FROM _prisma_migrations WHERE migration_name='20261001010000_super_admin_v2_phase_2d_commercial_proposals' AND finished_at IS NOT NULL`;
    expect(m).toBeDefined();
    await expect(
      prisma.commercialProposal.count({
        where: { createdAt: { lte: m.finishedAt } },
      }),
    ).resolves.toBe(0);
    await expect(
      prisma.commercialProspect.count({
        where: { createdAt: { lte: m.finishedAt } },
      }),
    ).resolves.toBe(0);
    await expect(
      prisma.capabilityEntitlement.count({
        where: { createdAt: { gte: m.startedAt, lte: m.finishedAt } },
      }),
    ).resolves.toBe(0);
  });
  it('enforces target XOR and typed inputs directly in PostgreSQL', async () => {
    const org = await prisma.organization.create({ data: { name: s } });
    await expect(
      prisma.commercialProposal.create({
        data: {
          reference: `${s}_bad`,
          title: 'bad',
          organizationId: org.id,
          prospectId: 'missing',
        },
      }),
    ).rejects.toThrow();
    const p = await prisma.commercialProposal.create({
      data: { reference: s, title: 'test', organizationId: org.id },
    });
    const r = await prisma.commercialProposalRevision.create({
      data: {
        proposalId: p.id,
        revisionNumber: 1,
        relationshipSnapshot: 'DIRECT',
        currency: 'CAD',
        recipientLegalName: 'Acme',
        recipientDisplayName: 'Acme',
        recipientCountry: 'CA',
        recipientPreferredLanguage: 'FR',
        calculationVersion: 'v1',
      },
    });
    await expect(
      prisma.proposalInput.create({
        data: {
          proposalRevisionId: r.id,
          code: 'SITES',
          category: 'QUANTITY',
          valueType: 'INTEGER',
          integerValue: 2n,
          decimalValue: '2',
          source: 'DECLARED',
          labelFR: 'Sites',
          displayOrder: 1,
        },
      }),
    ).rejects.toThrow();
  });
  it('protects frozen children, finalized documents and accepted uniqueness by direct access', async () => {
    const p = await prisma.commercialProposal.findUniqueOrThrow({
      where: { reference: s },
    });
    const r = await prisma.commercialProposalRevision.findFirstOrThrow({
      where: { proposalId: p.id },
    });
    await prisma.proposalLine.create({
      data: {
        proposalRevisionId: r.id,
        source: 'CUSTOM_COMPONENT',
        componentCode: 'CUSTOM',
        componentNameFR: 'Custom',
        pricingModel: 'CUSTOM',
        chargeType: 'ONE_TIME',
        calculationStatus: 'MANUAL',
        calculationExplanationFR: 'Manual',
        displayOrder: 1,
      },
    });
    const d = await prisma.proposalDocument.create({
      data: {
        proposalRevisionId: r.id,
        type: 'OFFER',
        language: 'FR',
        status: 'FINALIZED',
        fileName: 'offer.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 10,
        storageKey: `${s}/offer.pdf`,
        sha256: 'a'.repeat(64),
        templateVersion: 'v1',
        generatorVersion: 'v1',
        generationKey: `${s}:1`,
        generationStartedAt: new Date(),
        generatedAt: new Date(),
      },
    });
    await prisma.commercialProposalRevision.update({
      where: { id: r.id },
      data: { status: 'READY', lockVersion: { increment: 1 } },
    });
    await expect(
      prisma.proposalLine.updateMany({
        where: { proposalRevisionId: r.id },
        data: { componentNameFR: 'Changed' },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.proposalDocument.update({
        where: { id: d.id },
        data: { fileName: 'changed.pdf' },
      }),
    ).rejects.toThrow();
    await prisma.commercialProposalRevision.update({
      where: { id: r.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        sentDocumentId: d.id,
        lifecycleReason: 'sent',
        lockVersion: { increment: 1 },
      },
    });
    await prisma.commercialProposalRevision.update({
      where: { id: r.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedByName: 'Buyer',
        lifecycleReason: 'accepted',
        lockVersion: { increment: 1 },
      },
    });
    const r2 = await prisma.commercialProposalRevision.create({
      data: {
        proposalId: p.id,
        revisionNumber: 2,
        relationshipSnapshot: 'DIRECT',
        currency: 'CAD',
        recipientLegalName: 'Acme',
        recipientDisplayName: 'Acme',
        recipientCountry: 'CA',
        recipientPreferredLanguage: 'FR',
        calculationVersion: 'v1',
      },
    });
    const d2 = await prisma.proposalDocument.create({
      data: {
        proposalRevisionId: r2.id,
        type: 'OFFER',
        language: 'FR',
        status: 'FINALIZED',
        fileName: 'offer2.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 10,
        storageKey: `${s}/offer2.pdf`,
        sha256: 'b'.repeat(64),
        templateVersion: 'v1',
        generatorVersion: 'v1',
        generationKey: `${s}:2`,
        generationStartedAt: new Date(),
        generatedAt: new Date(),
      },
    });
    await expect(
      prisma.commercialProposalRevision.update({
        where: { id: r2.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          acceptedByName: 'Buyer',
          lifecycleReason: 'accepted',
          sentDocumentId: d2.id,
          lockVersion: { increment: 1 },
        },
      }),
    ).rejects.toThrow();
  });
});
