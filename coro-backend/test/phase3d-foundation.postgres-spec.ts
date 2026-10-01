import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error(
    'TEST_DATABASE_URL jetable est obligatoire pour phase3d-foundation.postgres-spec',
  );

describe('Phase 3D foundation PostgreSQL invariants', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const fixture = `p3d_${randomUUID()}`;

  afterAll(async () => prisma.$disconnect());

  it('migration is additive, creates no commercial rows and no evaluation ledger', async () => {
    const [migration] = await prisma.$queryRaw<
      Array<{ startedAt: Date; finishedAt: Date }>
    >`SELECT started_at AS "startedAt", finished_at AS "finishedAt"
      FROM _prisma_migrations
      WHERE migration_name = '20261003010000_super_admin_v2_phase_3d_commercial_quantity_binding'
        AND finished_at IS NOT NULL`;
    expect(migration).toBeDefined();
    await expect(
      prisma.proposalLine.count({
        where: {
          createdAt: { gte: migration.startedAt, lte: migration.finishedAt },
        },
      }),
    ).resolves.toBe(0);
    await expect(
      prisma.contractPriceSnapshotLine.count({
        where: {
          createdAt: { gte: migration.startedAt, lte: migration.finishedAt },
        },
      }),
    ).resolves.toBe(0);
    const [ledger] = await prisma.$queryRaw<Array<{ relation: string | null }>>`
      SELECT to_regclass('public."CommercialUsageEvaluation"')::text AS relation`;
    expect(ledger.relation).toBeNull();
  });

  it('enforces nullable, DECLARED and canonical METERED binding shapes', async () => {
    const organization = await prisma.organization.create({
      data: { name: `${fixture}_binding` },
    });
    const capability = await prisma.commercialCapability.findUniqueOrThrow({
      where: { code: 'COMPLIANCE_OPERATIONS' },
    });
    const proposal = await prisma.commercialProposal.create({
      data: {
        reference: `${fixture}_proposal`,
        title: 'Phase 3D binding',
        organizationId: organization.id,
      },
    });
    const revision = await prisma.commercialProposalRevision.create({
      data: {
        proposalId: proposal.id,
        revisionNumber: 1,
        relationshipSnapshot: 'DIRECT',
        currency: 'CAD',
        recipientLegalName: 'Phase 3D',
        recipientDisplayName: 'Phase 3D',
        recipientCountry: 'CA',
        recipientPreferredLanguage: 'FR',
        calculationVersion: 'proposal-pricing/v1',
      },
    });
    await expect(
      prisma.proposalLine.create({
        data: {
          proposalRevisionId: revision.id,
          source: 'CUSTOM_COMPONENT',
          capabilityId: capability.id,
          componentCode: `${fixture}_invalid`,
          componentNameFR: 'Invalid',
          pricingModel: 'CUSTOM',
          chargeType: 'ONE_TIME',
          calculationStatus: 'MANUAL',
          calculationExplanationFR: 'Invalid binding',
          commercialQuantityBasis: 'METERED',
          commercialRuleCode: 'not canonical',
          commercialRuleVersion: ' v1 ',
          displayOrder: 1,
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.proposalLine.create({
        data: {
          proposalRevisionId: revision.id,
          source: 'CUSTOM_COMPONENT',
          capabilityId: capability.id,
          componentCode: `${fixture}_declared`,
          componentNameFR: 'Declared',
          pricingModel: 'CUSTOM',
          chargeType: 'ONE_TIME',
          calculationStatus: 'MANUAL',
          calculationExplanationFR: 'Declared binding',
          commercialQuantityBasis: 'DECLARED',
          displayOrder: 2,
        },
      }),
    ).resolves.toMatchObject({ commercialQuantityBasis: 'DECLARED' });
  });

  it('allows organization correction before the first revision and rejects it afterwards', async () => {
    const first = await prisma.organization.create({
      data: { name: `${fixture}_first`, commercialRelationship: 'DIRECT' },
    });
    const second = await prisma.organization.create({
      data: { name: `${fixture}_second`, commercialRelationship: 'DIRECT' },
    });
    const priceBook = await prisma.priceBook.create({
      data: {
        code: `${fixture}_book`,
        name: 'Phase 3D book',
        audience: 'DIRECT',
        currency: 'CAD',
        versions: { create: { versionNumber: 1 } },
      },
      include: { versions: true },
    });
    const contract = await prisma.organizationContract.create({
      data: {
        organizationId: first.id,
        reference: `${fixture}_contract`,
        title: 'Phase 3D ancestry',
      },
    });
    await expect(
      prisma.organizationContract.update({
        where: { id: contract.id },
        data: { organizationId: second.id },
      }),
    ).resolves.toMatchObject({ organizationId: second.id });
    const revision = await prisma.organizationContractRevision.create({
      data: {
        contractId: contract.id,
        revisionNumber: 1,
        revisionType: 'INITIAL',
        priceBookVersionId: priceBook.versions[0].id,
        currency: 'CAD',
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        termStartAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
    const capability = await prisma.commercialCapability.findUniqueOrThrow({
      where: { code: 'COMPLIANCE_OPERATIONS' },
    });
    await expect(
      prisma.contractPriceSnapshotLine.create({
        data: {
          contractRevisionId: revision.id,
          source: 'CUSTOM_COMPONENT',
          capabilityId: capability.id,
          componentCode: `${fixture}_invalid_contract_line`,
          componentName: 'Invalid metered binding',
          pricingModel: 'CUSTOM',
          chargeType: 'ONE_TIME',
          currency: 'CAD',
          commercialQuantityBasis: 'METERED',
          commercialRuleCode: 'INVALID RULE',
          commercialRuleVersion: ' v1 ',
          displayOrder: 1,
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.organizationContract.update({
        where: { id: contract.id },
        data: { organizationId: first.id },
      }),
    ).rejects.toThrow('Contract organization ancestry is immutable');
    await expect(
      prisma.organizationContract.update({
        where: { id: contract.id },
        data: { title: 'Allowed lifecycle metadata update' },
      }),
    ).resolves.toMatchObject({ title: 'Allowed lifecycle metadata update' });
  });
});
