import { PrismaClient } from '@prisma/client';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { CommercialProposalsService } from '../src/commercial-proposals/commercial-proposals.service';
import { ProposalPricingEngine } from '../src/commercial-proposals/proposal-pricing-engine';
import { PrismaService } from '../src/prisma/prisma.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase('Phase 2D proposal concurrency matrix', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  const service = new CommercialProposalsService(
    prisma as unknown as PrismaService,
    new AdminAuditService(),
    new ProposalPricingEngine(),
  );
  const fixture = `p2d_concurrency_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let actorId: string;
  let organizationId: string;

  beforeAll(async () => {
    const organization = await prisma.organization.create({
      data: { name: fixture },
    });
    organizationId = organization.id;
    const actor = await prisma.user.create({
      data: {
        email: `${fixture}@example.test`,
        password: 'test-only-not-a-real-credential',
        firstName: 'Concurrency',
        lastName: 'Tester',
        role: 'SUPER_ADMIN',
        organizationId,
      },
    });
    actorId = actor.id;
  });

  afterAll(async () => prisma.$disconnect());

  const revisionDto = {
    relationship: 'DIRECT' as const,
    preferredLanguage: 'FR' as const,
    recipientLegalName: 'Concurrent Corp',
    recipientDisplayName: 'Concurrent',
    recipientCountry: 'CA',
  };

  it('serializes revision numbers', async () => {
    const proposal = await prisma.commercialProposal.create({
      data: {
        reference: `${fixture}_revision`,
        title: 'Concurrent revisions',
        organizationId,
        createdByUserId: actorId,
      },
    });
    const results = await Promise.all([
      service.createRevision(proposal.id, revisionDto, { userId: actorId }),
      service.createRevision(proposal.id, revisionDto, { userId: actorId }),
    ]);
    expect(results.map((revision) => revision.revisionNumber).sort()).toEqual([
      1, 2,
    ]);
  });

  it('serializes prospect conversion into one Organization', async () => {
    const prospect = await prisma.commercialProspect.create({
      data: {
        reference: `${fixture}_prospect`,
        legalName: 'Prospect Concurrent',
        displayName: 'Prospect Concurrent',
        preferredLanguage: 'FR',
        country: 'CA',
        createdByUserId: actorId,
      },
    });
    const [first, second] = await Promise.all([
      service.convertProspect(
        prospect.id,
        { reason: 'Concurrent conversion' },
        { userId: actorId },
      ),
      service.convertProspect(
        prospect.id,
        { reason: 'Concurrent retry' },
        { userId: actorId },
      ),
    ]);
    expect(first.id).toBe(second.id);
    const converted = await prisma.commercialProspect.findUniqueOrThrow({
      where: { id: prospect.id },
    });
    expect(converted.convertedOrganizationId).toBe(first.id);
    await expect(
      prisma.organization.count({
        where: { id: { in: [first.id, second.id] } },
      }),
    ).resolves.toBe(1);
  });

  it('allows only one concurrent acceptance and leaves a consistent root', async () => {
    const proposal = await prisma.commercialProposal.create({
      data: {
        reference: `${fixture}_acceptance`,
        title: 'Concurrent acceptance',
        organizationId,
        createdByUserId: actorId,
      },
    });
    const revision = await prisma.commercialProposalRevision.create({
      data: {
        proposalId: proposal.id,
        revisionNumber: 1,
        relationshipSnapshot: 'DIRECT',
        currency: 'CAD',
        recipientLegalName: 'Concurrent Corp',
        recipientDisplayName: 'Concurrent',
        recipientCountry: 'CA',
        recipientPreferredLanguage: 'FR',
        calculationVersion: 'proposal-pricing/v1',
        createdByUserId: actorId,
      },
    });
    const document = await prisma.proposalDocument.create({
      data: {
        proposalRevisionId: revision.id,
        type: 'OFFER',
        language: 'FR',
        status: 'FINALIZED',
        fileName: 'concurrent.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 10,
        storageKey: `${fixture}/concurrent.pdf`,
        sha256: 'e'.repeat(64),
        templateVersion: 'test/v1',
        generatorVersion: 'test/v1',
        generationKey: `${fixture}:acceptance`,
        generationStartedAt: new Date(),
        generatedAt: new Date(),
      },
    });
    await prisma.commercialProposalRevision.update({
      where: { id: revision.id },
      data: { status: 'READY', lockVersion: 1 },
    });
    await service.transition(
      revision.id,
      'SENT',
      { reason: 'Sent', lockVersion: 1, sentDocumentId: document.id },
      { userId: actorId },
    );
    const attempts = await Promise.allSettled([
      service.transition(
        revision.id,
        'ACCEPTED',
        { reason: 'Accepted', lockVersion: 2, acceptedByName: 'Buyer' },
        { userId: actorId },
      ),
      service.transition(
        revision.id,
        'ACCEPTED',
        { reason: 'Retry', lockVersion: 2, acceptedByName: 'Buyer' },
        { userId: actorId },
      ),
    ]);
    expect(
      attempts.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      attempts.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    await expect(
      prisma.commercialProposalRevision.count({
        where: { proposalId: proposal.id, status: 'ACCEPTED' },
      }),
    ).resolves.toBe(1);
    const root = await prisma.commercialProposal.findUniqueOrThrow({
      where: { id: proposal.id },
    });
    expect(root.acceptedRevisionId).toBe(revision.id);
    expect(root.status).toBe('ACCEPTED');
  });
});
