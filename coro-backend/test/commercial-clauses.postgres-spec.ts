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
    const clauseCount = await prisma.commercialClause.count();
    const approvedCount = await prisma.commercialClauseVersion.count({
      where: { status: 'APPROVED' },
    });
    const created = await service.createDraftCatalog(actor);
    expect(created).toHaveLength(25);
    expect(await prisma.commercialClause.count()).toBe(clauseCount + 25);
    expect(
      await prisma.commercialClauseVersion.count({
        where: { status: 'APPROVED' },
      }),
    ).toBe(approvedCount);
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

  it('preconfigures only untouched placeholders and is idempotent', async () => {
    const beforeDryRunAudit = await prisma.adminAuditEvent.count();
    const initial = await service.preconfigurationDryRun();
    expect(initial.items).toHaveLength(25);
    expect(initial.summary.ELIGIBLE_PLACEHOLDER).toBe(25);
    expect(await prisma.adminAuditEvent.count()).toBe(beforeDryRunAudit);

    const clauses = await service.list();
    const currency = clauses.find(
      ({ code }) => code === 'CURRENCY_AND_TAXES_STANDARD',
    )!.versions[0];
    await service.updateDraft(
      currency.id,
      {
        lockVersion: currency.lockVersion,
        titleFR: 'Devise — adaptation humaine',
        titleEN: 'Currency — human adaptation',
        textFR: 'Texte humain à préserver intégralement.',
        textEN: 'Human-authored wording that must be preserved.',
        provenance: 'HUMAN_AUTHORED_TEST',
        applicabilities: ['ALL_OFFERS'],
        parameters: [],
      },
      actor,
    );
    const invoicing = clauses.find(({ code }) => code === 'INVOICING_STANDARD')!
      .versions[0];
    await service.submit(
      invoicing.id,
      { lockVersion: invoicing.lockVersion, reason: 'Protected review state' },
      actor,
    );

    const protectedPlan = await service.preconfigurationDryRun();
    expect(protectedPlan.summary.ELIGIBLE_PLACEHOLDER).toBe(23);
    expect(protectedPlan.summary.HUMAN_EDITED_DRAFT).toBe(1);
    expect(protectedPlan.summary.PROTECTED_NON_DRAFT).toBe(1);
    expect(() =>
      service.applyPreconfiguration({ confirmation: 'WRONG' }, actor),
    ).toThrow('confirmation');

    const approvedBeforeApply = await prisma.commercialClauseVersion.count({
      where: { status: 'APPROVED' },
    });
    const applied = await service.applyPreconfiguration(
      { confirmation: 'APPLY_B01_STANDARD_DRAFTS' },
      actor,
    );
    expect(applied.summary.ALREADY_PRECONFIGURED).toBe(23);
    expect(applied.summary.HUMAN_EDITED_DRAFT).toBe(1);
    expect(applied.summary.PROTECTED_NON_DRAFT).toBe(1);
    expect(
      await prisma.adminAuditEvent.count({
        where: { action: 'COMMERCIAL_CLAUSE_STANDARD_DRAFT_PRECONFIGURED' },
      }),
    ).toBe(23);
    expect(
      await prisma.commercialClauseVersion.count({
        where: { status: 'APPROVED' },
      }),
    ).toBe(approvedBeforeApply);

    const repeated = await service.applyPreconfiguration(
      { confirmation: 'APPLY_B01_STANDARD_DRAFTS' },
      actor,
    );
    expect(repeated.summary.ALREADY_PRECONFIGURED).toBe(23);
    expect(
      await prisma.adminAuditEvent.count({
        where: { action: 'COMMERCIAL_CLAUSE_STANDARD_DRAFT_PRECONFIGURED' },
      }),
    ).toBe(23);
    const preserved = await prisma.commercialClauseVersion.findUniqueOrThrow({
      where: { id: currency.id },
    });
    expect(preserved.titleFR).toBe('Devise — adaptation humaine');
    expect(preserved.provenance).toBe('HUMAN_AUTHORED_TEST');

    const renewalClause = (await service.list()).find(
      ({ code }) => code === 'RENEWAL_STANDARD',
    )!;
    const renewal = renewalClause.versions[0];
    const ownedRenewal = await service.updateDraft(
      renewal.id,
      {
        lockVersion: renewal.lockVersion,
        titleFR: renewal.titleFR,
        titleEN: renewal.titleEN,
        textFR: renewal.textFR,
        textEN: renewal.textEN,
        businessOwner: 'Commercial',
        legalOwner: 'Legal',
        isRequired: renewal.isRequired ?? true,
        provenance: renewal.provenance,
        applicabilities: renewal.applicabilities.map(({ scope }) => scope),
        parameters: renewal.parameterSchema as never,
      },
      actor,
    );
    const renewalReview = await service.submit(
      ownedRenewal.id,
      {
        lockVersion: ownedRenewal.lockVersion,
        reason: 'Review unresolved terms',
      },
      actor,
    );
    const renewalLegal = await service.recordLegalReview(
      renewalReview.id,
      {
        lockVersion: renewalReview.lockVersion,
        reason: 'Legal review identifies unresolved renewal term',
        evidence: 'TEST-UNRESOLVED-RENEWAL-EVIDENCE',
      },
      actor,
    );
    await expect(
      service.approve(
        renewalLegal.id,
        {
          lockVersion: renewalLegal.lockVersion,
          reason: 'Must remain blocked',
        },
        actor,
      ),
    ).rejects.toThrow('Unresolved clause terms');
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
    expect(
      (await service.approvedProjection()).some(
        ({ commercialClause }) =>
          commercialClause.code === 'OFFER_VALIDITY_STANDARD',
      ),
    ).toBe(true);
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
