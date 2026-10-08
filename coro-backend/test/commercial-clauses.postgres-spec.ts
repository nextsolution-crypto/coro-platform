import { PrismaClient } from '@prisma/client';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { CommercialClauseService } from '../src/commercial-clauses/commercial-clause.service';

const url = process.env.TEST_DATABASE_URL;
const describeDatabase = url ? describe : describe.skip;

describeDatabase('Governed commercial clause library PostgreSQL', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const service = new CommercialClauseService(
    prisma as never,
    new AdminAuditService(),
  );
  let actor: { userId: string };

  beforeAll(async () => {
    const organization = await prisma.organization.create({
      data: { name: `clauses_${Date.now()}` },
    });
    const user = await prisma.user.create({
      data: {
        email: `clauses_${Date.now()}@example.test`,
        password: 'test-only',
        firstName: 'Clause',
        lastName: 'Owner',
        role: 'SUPER_ADMIN',
        organizationId: organization.id,
      },
    });
    actor = { userId: user.id };
  });
  afterAll(async () => prisma.$disconnect());

  it('creates exactly the governed NOT_APPROVED draft catalog without customer-safe leakage', async () => {
    const proposalCount = await prisma.commercialProposal.count();
    const created = await service.createDraftCatalog(actor);
    expect(created).toHaveLength(25);
    expect(await prisma.commercialClause.count()).toBe(25);
    expect(
      await prisma.commercialClauseVersion.count({
        where: { status: 'APPROVED' },
      }),
    ).toBe(0);
    expect(await service.approvedProjection()).toEqual([]);
    expect(await prisma.commercialProposal.count()).toBe(proposalCount);
    await expect(service.createDraftCatalog(actor)).rejects.toThrow(
      'already exists',
    );
    expect(
      await prisma.adminAuditEvent.count({
        where: { action: 'COMMERCIAL_CLAUSE_DRAFT_CREATED' },
      }),
    ).toBe(25);
  });

  it('requires typed parameters, separate legal evidence and immutable approval', async () => {
    const clause = (await service.list()).find(
      ({ code }) => code === 'OFFER_VALIDITY_STANDARD',
    )!;
    const draft = clause.versions[0];
    await expect(
      service.updateDraft(
        draft.id,
        {
          lockVersion: draft.lockVersion,
          titleFR: draft.titleFR,
          titleEN: draft.titleEN,
          textFR: 'Texte revu.',
          textEN: 'Reviewed text.',
          businessOwner: 'Commercial',
          legalOwner: 'Legal',
          isRequired: true,
          provenance: 'TEST_REVIEWED_SOURCE',
          applicabilities: ['ALL_OFFERS'],
          parameters: [
            {
              key: 'paymentDeadlineDays',
              type: 'DURATION_DAYS',
              required: true,
            },
          ],
        },
        actor,
      ),
    ).rejects.toThrow('NOT_ALLOWED');
    const updated = await service.updateDraft(
      draft.id,
      {
        lockVersion: draft.lockVersion,
        titleFR: draft.titleFR,
        titleEN: draft.titleEN,
        textFR: 'Texte revu.',
        textEN: 'Reviewed text.',
        businessOwner: 'Commercial',
        legalOwner: 'Legal',
        isRequired: true,
        provenance: 'TEST_REVIEWED_SOURCE',
        applicabilities: ['ALL_OFFERS'],
        parameters: [
          { key: 'offerValidityDays', type: 'DURATION_DAYS', required: true },
        ],
      },
      actor,
    );
    const firstReview = await service.submit(
      updated.id,
      { lockVersion: updated.lockVersion, reason: 'Business-owner review' },
      actor,
    );
    const returnedDraft = await service.returnToDraft(
      firstReview.id,
      {
        lockVersion: firstReview.lockVersion,
        reason: 'Review changes requested',
      },
      actor,
    );
    expect(returnedDraft.status).toBe('DRAFT');
    expect(returnedDraft.legalReviewEvidence).toBeNull();
    const review = await service.submit(
      returnedDraft.id,
      {
        lockVersion: returnedDraft.lockVersion,
        reason: 'Business-owner review completed',
      },
      actor,
    );
    await expect(
      service.approve(
        review.id,
        { lockVersion: review.lockVersion, reason: 'Premature approval' },
        actor,
      ),
    ).rejects.toThrow('Legal-review evidence');
    const legallyReviewed = await service.recordLegalReview(
      review.id,
      {
        lockVersion: review.lockVersion,
        reason: 'Legal review completed',
        evidence: 'TEST-LEGAL-EVIDENCE-001',
      },
      actor,
    );
    const approved = await service.approve(
      legallyReviewed.id,
      {
        lockVersion: legallyReviewed.lockVersion,
        reason: 'Explicit approval',
      },
      actor,
    );
    expect(approved.status).toBe('APPROVED');
    expect(await service.approvedProjection()).toHaveLength(1);
    await expect(
      prisma.commercialClauseVersion.update({
        where: { id: approved.id },
        data: { textFR: 'Tampered' },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.commercialClauseApplicability.delete({
        where: {
          commercialClauseVersionId_scope: {
            commercialClauseVersionId: approved.id,
            scope: 'ALL_OFFERS',
          },
        },
      }),
    ).rejects.toThrow();
    const archived = await service.archive(
      approved.id,
      {
        lockVersion: approved.lockVersion,
        reason: 'Archive for revision test',
      },
      actor,
    );
    expect(archived.status).toBe('ARCHIVED');
    const attempts = await Promise.allSettled([
      service.createRevision('OFFER_VALIDITY_STANDARD', actor),
      service.createRevision('OFFER_VALIDITY_STANDARD', actor),
    ]);
    expect(
      attempts.filter(({ status }) => status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      await prisma.adminAuditEvent.count({
        where: { action: 'COMMERCIAL_CLAUSE_APPROVED', targetId: approved.id },
      }),
    ).toBe(1);
  });
});
