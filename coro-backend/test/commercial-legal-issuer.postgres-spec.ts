import { PrismaClient } from '@prisma/client';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { CommercialLegalIssuerService } from '../src/commercial-legal-issuer/commercial-legal-issuer.service';

const url = process.env.TEST_DATABASE_URL;
const describeDatabase = url ? describe : describe.skip;

describeDatabase('Commercial legal issuer authority PostgreSQL', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const service = new CommercialLegalIssuerService(
    prisma as never,
    new AdminAuditService(),
  );
  let actor: { userId: string };
  beforeAll(async () => {
    const organization = await prisma.organization.create({
      data: { name: `issuer_${Date.now()}` },
    });
    const user = await prisma.user.create({
      data: {
        email: `issuer_${Date.now()}@example.test`,
        password: 'test-only',
        firstName: 'Legal',
        lastName: 'Owner',
        role: 'SUPER_ADMIN',
        organizationId: organization.id,
      },
    });
    actor = { userId: user.id };
  });
  afterAll(async () => prisma.$disconnect());

  it('keeps the CORO administrative base as an incomplete audited DRAFT', async () => {
    const proposalCount = await prisma.commercialProposal.count();
    const draft = await service.createCoroDraft(actor);
    expect(draft.status).toBe('DRAFT');
    expect(draft.legalName).toBe(
      'MATHIEU MONTAROUX, faisant affaire sous le nom CORO',
    );
    expect(draft.addressLine1).toBeNull();
    await expect(
      service.verify(
        draft.id,
        { lockVersion: draft.lockVersion, reason: 'Premature' },
        actor,
      ),
    ).rejects.toThrow('incomplete');
    expect(await prisma.commercialProposal.count()).toBe(proposalCount);
    expect(
      await prisma.adminAuditEvent.count({
        where: {
          action: 'COMMERCIAL_LEGAL_ISSUER_DRAFT_CREATED',
          targetId: draft.id,
        },
      }),
    ).toBe(1);
  });

  it('verifies explicitly, snapshots deterministically, versions concurrently and retains immutable history', async () => {
    const draft = (await service.list())
      .find(({ code }) => code === 'CORO')!
      .versions.find(({ status }) => status === 'DRAFT')!;
    const complete = await service.updateDraft(
      draft.id,
      {
        lockVersion: draft.lockVersion,
        legalName: draft.legalName,
        tradeName: 'CORO',
        legalForm: 'Entreprise individuelle',
        country: 'CA',
        subdivision: 'QC',
        addressLine1: '100 rue Test',
        city: 'Montréal',
        postalCode: 'H0H 0H0',
        officialEmail: 'legal@example.test',
        officialPhone: '+15145550100',
        website: 'https://example.test',
        businessNumberApplicability: 'NOT_APPLICABLE',
        federalTaxApplicability: 'NOT_APPLICABLE',
        provincialTaxApplicability: 'NOT_APPLICABLE',
        referenceCurrency: 'CAD',
        provenance: draft.provenance,
      },
      actor,
    );
    const verified = await service.verify(
      complete.id,
      { lockVersion: complete.lockVersion, reason: 'Fixture verified' },
      actor,
    );
    expect(verified.status).toBe('VERIFIED');
    await expect(
      prisma.commercialLegalIssuerVersion.update({
        where: { id: verified.id },
        data: { legalName: 'Tampered' },
      }),
    ).rejects.toThrow();
    const organization = await prisma.organization.create({
      data: { name: `proposal_${Date.now()}` },
    });
    const proposal = await prisma.commercialProposal.create({
      data: {
        reference: `ISSUER-${Date.now()}`,
        title: 'Issuer snapshot fixture',
        organizationId: organization.id,
      },
    });
    const revision = await prisma.commercialProposalRevision.create({
      data: {
        proposalId: proposal.id,
        revisionNumber: 1,
        relationshipSnapshot: 'DIRECT',
        currency: 'CAD',
        recipientLegalName: 'Customer Test',
        recipientDisplayName: 'Customer',
        recipientCountry: 'CA',
        recipientPreferredLanguage: 'FR',
        calculationVersion: 'proposal-pricing/v2',
      },
    });
    const snapshot = await service.captureSnapshot(revision.id, 'CORO', actor);
    expect(snapshot.snapshotHash).toHaveLength(64);
    expect(snapshot.legalName).toBe(verified.legalName);
    const secondRevision = await prisma.commercialProposalRevision.create({
      data: {
        proposalId: proposal.id,
        revisionNumber: 2,
        relationshipSnapshot: 'DIRECT',
        currency: 'CAD',
        recipientLegalName: 'Customer Test',
        recipientDisplayName: 'Customer',
        recipientCountry: 'CA',
        recipientPreferredLanguage: 'FR',
        calculationVersion: 'proposal-pricing/v2',
      },
    });
    const secondSnapshot = await service.captureSnapshot(
      secondRevision.id,
      'CORO',
      actor,
    );
    expect(secondSnapshot.snapshotHash).toBe(snapshot.snapshotHash);
    await expect(
      service.captureSnapshot(revision.id, 'CORO', actor),
    ).rejects.toThrow('already has');
    await expect(
      prisma.commercialLegalIssuerSnapshot.update({
        where: { id: snapshot.id },
        data: { tradeName: 'Tampered' },
      }),
    ).rejects.toThrow();
    const attempts = await Promise.allSettled([
      service.createRevision('CORO', actor),
      service.createRevision('CORO', actor),
    ]);
    expect(
      attempts.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const archived = await service.archive(
      verified.id,
      { lockVersion: verified.lockVersion, reason: 'Historical archive' },
      actor,
    );
    expect(archived.status).toBe('ARCHIVED');
    await expect(
      prisma.commercialLegalIssuerVersion.delete({
        where: { id: archived.id },
      }),
    ).rejects.toThrow();
    expect(
      await prisma.adminAuditEvent.count({
        where: {
          action: 'COMMERCIAL_LEGAL_ISSUER_SNAPSHOT_CAPTURED',
          targetId: snapshot.id,
        },
      }),
    ).toBe(1);
  });
});
