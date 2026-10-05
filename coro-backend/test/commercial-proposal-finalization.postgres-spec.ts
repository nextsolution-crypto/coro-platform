import { PrismaClient } from '@prisma/client';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { CommercialProposalsService } from '../src/commercial-proposals/commercial-proposals.service';
import { ProposalPricingEngine } from '../src/commercial-proposals/proposal-pricing-engine';

const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error(
    'TEST_DATABASE_URL jetable est obligatoire pour commercial-proposal-finalization.postgres-spec',
  );

describe('Proposal founder finalization PostgreSQL', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const service = new CommercialProposalsService(
    prisma as never,
    new AdminAuditService(),
    new ProposalPricingEngine(),
  );
  let proposalId: string;
  let revisionId: string;
  let actorId: string;

  beforeAll(async () => {
    await prisma.$connect();
    const organization = await prisma.organization.create({
      data: { name: 'FIX06 disposable issuer' },
    });
    const actor = await prisma.user.create({
      data: {
        email: `fix06-${Date.now()}@example.invalid`,
        password: 'test-only',
        firstName: 'Founder',
        lastName: 'Test',
        role: 'SUPER_ADMIN',
        organizationId: organization.id,
        companyName: 'CORO TEST ISSUER',
        companyEmail: 'issuer@example.invalid',
        companyPhone: '+1 555 010 0606',
        companyWebsite: 'https://example.invalid',
        companyAddress: '100 Test Street',
      },
    });
    actorId = actor.id;
    const proposal = await prisma.commercialProposal.create({
      data: {
        reference: `FIX06-${Date.now()}`,
        title: 'FIX06 TEST ONLY',
        organizationId: organization.id,
        createdByUserId: actor.id,
      },
    });
    proposalId = proposal.id;
    const revision = await prisma.commercialProposalRevision.create({
      data: {
        proposalId,
        revisionNumber: 1,
        relationshipSnapshot: 'DIRECT',
        currency: 'CAD',
        recipientLegalName: 'Customer TEST',
        recipientDisplayName: 'Customer TEST',
        recipientCountry: 'CA',
        recipientPreferredLanguage: 'FR',
        calculationVersion: 'proposal-pricing/v1',
        createdByUserId: actor.id,
      },
    });
    revisionId = revision.id;
  });

  afterAll(async () => prisma.$disconnect());

  it('persists finalization metadata atomically and projects the issuer', async () => {
    const updated = await service.updateFinalization(
      proposalId,
      revisionId,
      {
        lockVersion: 0,
        validFrom: '2027-01-01T00:00:00.000Z',
        validUntil: '2027-02-01T00:00:00.000Z',
        contextFR: 'Contexte TEST approuvÃ© pour validation.',
        termsFR: 'Conditions TEST uniquement.',
      },
      { userId: actorId },
    );
    expect(updated).toMatchObject({
      lockVersion: 1,
      contextFR: 'Contexte TEST approuvÃ© pour validation.',
      termsFR: 'Conditions TEST uniquement.',
    });
    const preview = await service.customerPreview(proposalId, revisionId);
    expect(preview).toMatchObject({
      validity: {
        validFrom: '2027-01-01T00:00:00.000Z',
        validUntil: '2027-02-01T00:00:00.000Z',
      },
      commercialTerms: {
        contextFr: 'Contexte TEST approuvÃ© pour validation.',
        termsFr: 'Conditions TEST uniquement.',
      },
      issuer: {
        brandName: 'CORO TEST ISSUER',
        email: 'issuer@example.invalid',
      },
    });
    await expect(
      prisma.adminAuditEvent.count({
        where: {
          action: 'PROPOSAL_FINALIZATION_UPDATED',
          targetId: revisionId,
        },
      }),
    ).resolves.toBe(1);
  });

  it('rejects a stale lockVersion without overwriting the revision', async () => {
    await expect(
      service.updateFinalization(
        proposalId,
        revisionId,
        { lockVersion: 0, termsFR: 'Stale overwrite' },
        { userId: actorId },
      ),
    ).rejects.toThrow('Conflit de version');
    await expect(
      prisma.commercialProposalRevision.findUniqueOrThrow({
        where: { id: revisionId },
        select: { termsFR: true, lockVersion: true },
      }),
    ).resolves.toEqual({
      termsFR: 'Conditions TEST uniquement.',
      lockVersion: 1,
    });
  });
});
