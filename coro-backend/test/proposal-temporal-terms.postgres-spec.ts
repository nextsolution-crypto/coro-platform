import { PrismaClient } from '@prisma/client';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { CommercialProposalsService } from '../src/commercial-proposals/commercial-proposals.service';

const url = process.env.TEST_DATABASE_URL;
const describeDb = url ? describe : describe.skip;

describeDb('Proposal temporal terms PostgreSQL authority', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const service = new CommercialProposalsService(
    prisma as never,
    new AdminAuditService(),
    {} as never,
  );
  const suffix = `temporal_${Date.now()}`;
  let actor: { userId: string };
  let proposalId: string;
  let revisionId: string;

  beforeAll(async () => {
    const organization = await prisma.organization.create({
      data: { name: suffix },
    });
    const user = await prisma.user.create({
      data: {
        email: `${suffix}@example.test`,
        password: 'test-only',
        firstName: 'Temporal',
        lastName: 'Owner',
        role: 'SUPER_ADMIN',
        organizationId: organization.id,
      },
    });
    actor = { userId: user.id };
    const proposal = await prisma.commercialProposal.create({
      data: {
        reference: suffix,
        title: 'Temporal test',
        organizationId: organization.id,
      },
    });
    proposalId = proposal.id;
    const revision = await prisma.commercialProposalRevision.create({
      data: {
        proposalId,
        revisionNumber: 1,
        relationshipSnapshot: 'DIRECT',
        currency: 'CAD',
        recipientLegalName: 'Synthetic customer',
        recipientDisplayName: 'Synthetic customer',
        recipientCountry: 'CA',
        recipientPreferredLanguage: 'FR',
        calculationVersion: 'test',
      },
    });
    revisionId = revision.id;
  });

  afterAll(async () => prisma.$disconnect());

  it('reads a historical revision without creating temporal rows', async () => {
    const before = await prisma.commercialProposalTemporalTerms.count();
    const result = await service.temporalTerms(proposalId, revisionId);
    expect(result.defaultsApplied).toBe(true);
    expect(result.calculated.blockers).toEqual([
      'SERVICE_START_DATE_REQUIRED',
      'INITIAL_INVOICE_DATE_REQUIRED',
      'RENEWAL_TERM_MONTHS_TO_CONFIRM',
    ]);
    expect(await prisma.commercialProposalTemporalTerms.count()).toBe(before);
  });

  it('records civil dates, provenance and audit with optimistic locking', async () => {
    const result = await service.updateTemporalTerms(
      proposalId,
      revisionId,
      {
        revisionLockVersion: 0,
        serviceStartDate: '2026-11-01',
        initialInvoiceDate: '2026-11-01',
        externalSignatureDate: '2026-10-31',
        externalSignatureEvidence: 'manual-signature-record:test',
      },
      actor,
    );
    expect(result.calculated.initialTermEndExclusive).toBe('2027-11-01');
    expect(result.calculated.paymentDueDate).toBe('2026-12-01');
    expect(result.calculated.blockers).toEqual([
      'RENEWAL_TERM_MONTHS_TO_CONFIRM',
    ]);
    await expect(
      service.updateTemporalTerms(
        proposalId,
        revisionId,
        { revisionLockVersion: 0 },
        actor,
      ),
    ).rejects.toThrow('Conflit de version');
    expect(
      await prisma.adminAuditEvent.count({
        where: {
          action: 'PROPOSAL_TEMPORAL_TERMS_UPDATED',
          targetId: revisionId,
        },
      }),
    ).toBe(1);
  });

  it('requires evidence and protects terms once the revision leaves DRAFT', async () => {
    const revision = await prisma.commercialProposalRevision.findUniqueOrThrow({
      where: { id: revisionId },
    });
    await expect(
      service.updateTemporalTerms(
        proposalId,
        revisionId,
        {
          revisionLockVersion: revision.lockVersion,
          temporalLockVersion: 0,
          externalSignatureDate: '2026-11-02',
        },
        actor,
      ),
    ).rejects.toThrow('requises ensemble');
    await prisma.commercialProposalRevision.update({
      where: { id: revisionId },
      data: { status: 'INTERNAL_REVIEW', lockVersion: { increment: 1 } },
    });
    await expect(
      prisma.commercialProposalTemporalTerms.updateMany({
        where: { proposalRevisionId: revisionId },
        data: { initialTermMonths: 13 },
      }),
    ).rejects.toThrow();
    await expect(
      service.updateTemporalTerms(
        proposalId,
        revisionId,
        { revisionLockVersion: revision.lockVersion + 1 },
        actor,
      ),
    ).rejects.toThrow('DRAFT');
  });
});
