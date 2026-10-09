import { PrismaClient } from '@prisma/client';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { CommercialContentService } from '../src/commercial-content/commercial-content.service';

const url = process.env.TEST_DATABASE_URL;
const describeDatabase = url ? describe : describe.skip;

describeDatabase('Commercial content authority PostgreSQL', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const service = new CommercialContentService(
    prisma as never,
    new AdminAuditService(),
  );
  let actor: { userId: string };

  beforeAll(async () => {
    const organization = await prisma.organization.create({
      data: { name: `content_${Date.now()}` },
    });
    const user = await prisma.user.create({
      data: {
        email: `content_${Date.now()}@example.test`,
        password: 'test-only',
        firstName: 'Content',
        lastName: 'Owner',
        role: 'SUPER_ADMIN',
        organizationId: organization.id,
      },
    });
    actor = { userId: user.id };
  });
  afterAll(async () => prisma.$disconnect());

  it('creates the Professional matrix only as an audited DRAFT', async () => {
    const proposalCountBefore = await prisma.commercialProposal.count();
    const entitlementCountBefore = await prisma.capabilityEntitlement.count();
    const existing = await prisma.commercialContent.findUnique({
      where: { code: 'CORO_PROFESSIONAL' },
      include: { versions: { include: { bindings: true } } },
    });
    const draft = existing
      ? (existing.versions.find(({ status }) => status === 'DRAFT') ??
        (await service.createRevision('CORO_PROFESSIONAL', actor)))
      : await service.createProfessionalDraft(actor);
    expect(draft.status).toBe('DRAFT');
    expect(draft.bindings).toHaveLength(20);
    expect(
      await prisma.adminAuditEvent.count({
        where: {
          action: {
            in: [
              'COMMERCIAL_CONTENT_DRAFT_CREATED',
              'COMMERCIAL_CONTENT_REVISION_CREATED',
            ],
          },
          actorUserId: actor.userId,
        },
      }),
    ).toBe(1);
    expect(await prisma.commercialProposal.count()).toBe(proposalCountBefore);
    expect(await prisma.capabilityEntitlement.count()).toBe(
      entitlementCountBefore,
    );
  });

  it('creates a new draft revision, validates targets, approves explicitly and enforces DB immutability', async () => {
    const initial = (await service.detail('CORO_PROFESSIONAL')).versions.find(
      ({ status }) => status === 'DRAFT',
    )!;
    const baseUpdate = {
      lockVersion: initial.lockVersion,
      titleFR: initial.titleFR,
      descriptionFR: initial.descriptionFR,
      provenance: initial.provenance,
      bindings: initial.bindings.map((binding) => ({
        targetType: binding.targetType,
        targetCode: binding.targetCode,
        labelFR: binding.labelFR,
        commercialIntent: binding.commercialIntent,
        deliveryMaturity: binding.deliveryMaturity,
        evidence: binding.evidence ?? undefined,
        displayOrder: binding.displayOrder,
      })),
    };
    await expect(
      service.updateDraft(
        initial.id,
        {
          ...baseUpdate,
          bindings: [...baseUpdate.bindings, baseUpdate.bindings[0]],
        },
        actor,
      ),
    ).rejects.toThrow('DUPLICATE_CONTENT_BINDING');
    await expect(
      service.updateDraft(
        initial.id,
        {
          ...baseUpdate,
          bindings: baseUpdate.bindings.map((binding, index) =>
            index === 0
              ? { ...binding, targetCode: 'INVENTED_FEATURE' }
              : binding,
          ),
        },
        actor,
      ),
    ).rejects.toThrow('UNKNOWN_CONTENT_TARGET');
    const bilingual = await service.updateDraft(
      initial.id,
      {
        lockVersion: initial.lockVersion,
        titleFR: initial.titleFR,
        titleEN: 'CORO Professional — Compliance & Operations',
        descriptionFR: initial.descriptionFR,
        descriptionEN: 'Draft commercial matrix subject to explicit approval.',
        provenance: initial.provenance,
        bindings: initial.bindings.map((binding) => ({
          targetType: binding.targetType,
          targetCode: binding.targetCode,
          labelFR: binding.labelFR,
          labelEN: `${binding.labelFR} (EN)`,
          commercialIntent: binding.commercialIntent,
          deliveryMaturity: binding.deliveryMaturity,
          evidence: binding.evidence ?? undefined,
          displayOrder: binding.displayOrder,
        })),
      },
      actor,
    );
    await service.submit(
      bilingual.id,
      { lockVersion: bilingual.lockVersion, reason: 'Review maturity' },
      actor,
    );
    const inReview = (await service.detail('CORO_PROFESSIONAL')).versions[0];
    await expect(
      service.createRevision('CORO_PROFESSIONAL', actor),
    ).rejects.toThrow('open revision');
    await expect(
      service.approve(
        inReview.id,
        { lockVersion: inReview.lockVersion, reason: 'Premature' },
        actor,
      ),
    ).rejects.toThrow('UNVERIFIED');
    const returned = await service.returnToDraft(
      inReview.id,
      {
        lockVersion: inReview.lockVersion,
        reason: 'Maturity evidence required',
      },
      actor,
    );
    const draft = await service.updateDraft(
      returned.id,
      {
        lockVersion: returned.lockVersion,
        titleFR: returned.titleFR,
        titleEN: returned.titleEN ?? undefined,
        descriptionFR: returned.descriptionFR,
        descriptionEN: returned.descriptionEN ?? undefined,
        provenance: returned.provenance,
        bindings: returned.bindings.map((binding) => ({
          targetType: binding.targetType,
          targetCode: binding.targetCode,
          labelFR: binding.labelFR,
          labelEN: binding.labelEN ?? undefined,
          commercialIntent: binding.commercialIntent,
          deliveryMaturity:
            binding.targetCode === 'PMU_PSI_PCA'
              ? 'LIMITED'
              : binding.deliveryMaturity,
          evidence: binding.evidence ?? undefined,
          displayOrder: binding.displayOrder,
        })),
      },
      actor,
    );
    await service.submit(
      draft.id,
      { lockVersion: draft.lockVersion, reason: 'Complete review' },
      actor,
    );
    const completeReview = (await service.detail('CORO_PROFESSIONAL'))
      .versions[0];
    const approved = await service.approve(
      completeReview.id,
      { lockVersion: completeReview.lockVersion, reason: 'Explicit approval' },
      actor,
    );
    expect(approved.status).toBe('APPROVED');
    expect(
      await prisma.adminAuditEvent.count({
        where: {
          action: 'COMMERCIAL_CONTENT_APPROVED',
          targetId: approved.id,
          actorUserId: actor.userId,
        },
      }),
    ).toBe(1);
    await expect(
      prisma.commercialContentVersion.update({
        where: { id: approved.id },
        data: { titleFR: 'Tampered' },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.commercialContentBinding.update({
        where: { id: approved.bindings[0].id },
        data: { labelFR: 'Tampered' },
      }),
    ).rejects.toThrow();
    const attempts = await Promise.allSettled([
      service.createRevision('CORO_PROFESSIONAL', actor),
      service.createRevision('CORO_PROFESSIONAL', actor),
    ]);
    expect(
      attempts.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      await prisma.commercialContentVersion.count({
        where: {
          commercialContentId: approved.commercialContentId,
          status: 'DRAFT',
        },
      }),
    ).toBe(1);
    const archived = await service.archive(
      approved.id,
      { lockVersion: approved.lockVersion, reason: 'Historical retention' },
      actor,
    );
    expect(archived.status).toBe('ARCHIVED');
    expect(
      await prisma.adminAuditEvent.count({
        where: {
          action: 'COMMERCIAL_CONTENT_ARCHIVED',
          targetId: archived.id,
          actorUserId: actor.userId,
        },
      }),
    ).toBe(1);
    await expect(
      prisma.commercialContentVersion.delete({ where: { id: archived.id } }),
    ).rejects.toThrow();
  });
});
