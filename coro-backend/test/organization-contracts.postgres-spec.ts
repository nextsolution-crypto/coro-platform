import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error(
    'TEST_DATABASE_URL jetable est obligatoire pour organization-contracts.postgres-spec',
  );
describe('Phase 2B PostgreSQL invariants', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const s = randomUUID();
  let org = '';
  let user = '';
  let pbv = '';
  let contract = '';
  let revision = '';
  let adjustment = '';
  beforeAll(async () => {
    await prisma.$connect();
    org = `p2b-org-${s}`;
    user = `p2b-user-${s}`;
    await prisma.organization.create({
      data: { id: org, name: 'Phase 2B', commercialRelationship: 'DIRECT' },
    });
    await prisma.user.create({
      data: {
        id: user,
        email: `${s}@example.invalid`,
        password: 'x',
        firstName: 'P2B',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        organizationId: org,
      },
    });
    const cap = await prisma.commercialCapability.findUniqueOrThrow({
      where: { code: 'COMPLIANCE_OPERATIONS' },
    });
    const book = await prisma.priceBook.create({
      data: {
        code: `P2B_${s.replace(/-/g, '').slice(0, 12).toUpperCase()}`,
        name: 'P2B',
        audience: 'DIRECT',
        currency: 'CAD',
      },
    });
    const v = await prisma.priceBookVersion.create({
      data: {
        priceBookId: book.id,
        versionNumber: 1,
        status: 'DRAFT',
        effectiveFrom: new Date('2026-01-01'),
      },
    });
    pbv = v.id;
    await prisma.priceComponent.create({
      data: {
        priceBookVersionId: v.id,
        capabilityId: cap.id,
        code: 'BASE',
        nameFr: 'Base',
        nameEn: 'Base',
        pricingModel: 'FLAT',
        chargeType: 'RECURRING',
        billingPeriod: 'MONTH',
        metric: 'FIXED',
        amountMinor: 10000n,
        displayOrder: 1,
      },
    });
    await prisma.priceBookVersion.update({
      where: { id: v.id },
      data: { status: 'ACTIVE', publishedAt: new Date() },
    });
  });
  afterAll(() => prisma.$disconnect());
  it('migration creates no contract data', async () => {
    expect(
      await prisma.organizationContract.count({
        where: { organizationId: org },
      }),
    ).toBe(0);
  });
  it('locks signed revision and every child directly', async () => {
    const c = await prisma.organizationContract.create({
      data: {
        organizationId: org,
        reference: `P2B-${s}`,
        title: 'Contract',
        isPrimary: true,
      },
    });
    contract = c.id;
    const r = await prisma.organizationContractRevision.create({
      data: {
        contractId: c.id,
        revisionNumber: 1,
        revisionType: 'INITIAL',
        priceBookVersionId: pbv,
        currency: 'CAD',
        effectiveFrom: new Date('2026-01-01'),
        termStartAt: new Date('2026-01-01'),
      },
    });
    revision = r.id;
    const a = await prisma.contractPricingAdjustment.create({
      data: {
        contractRevisionId: r.id,
        scope: 'GLOBAL',
        adjustmentType: 'PERCENT_DISCOUNT',
        discountBasisPoints: 1000,
        justification: 'test',
        displayOrder: 1,
      },
    });
    adjustment = a.id;
    const cap = await prisma.commercialCapability.findUniqueOrThrow({
      where: { code: 'COMPLIANCE_OPERATIONS' },
    });
    const line = await prisma.contractPriceSnapshotLine.create({
      data: {
        contractRevisionId: r.id,
        source: 'CATALOG_COMPONENT',
        sourcePriceComponentId: (
          await prisma.priceComponent.findFirstOrThrow({
            where: { priceBookVersionId: pbv },
          })
        ).id,
        capabilityId: cap.id,
        componentCode: 'BASE',
        componentName: 'Base',
        pricingModel: 'FLAT',
        chargeType: 'RECURRING',
        billingPeriod: 'MONTH',
        metric: 'FIXED',
        currency: 'CAD',
        catalogAmountMinor: 10000n,
        contractAmountMinor: 9000n,
        displayOrder: 1,
      },
    });
    const tier = await prisma.contractPriceSnapshotTier.create({
      data: {
        snapshotLineId: line.id,
        minimumQuantity: 0,
        maximumQuantity: null,
        catalogAmountMinor: 10000n,
        contractAmountMinor: 9000n,
        displayOrder: 1,
      },
    });
    const commitment = await prisma.contractMinimumCommitment.create({
      data: {
        contractRevisionId: r.id,
        type: 'MINIMUM_SPEND',
        period: 'YEAR',
        amountMinor: 1000n,
        currency: 'CAD',
      },
    });
    const exclusivityFee = await prisma.contractPriceSnapshotLine.create({
      data: {
        contractRevisionId: r.id,
        source: 'EXCLUSIVITY_FEE',
        capabilityId: null,
        componentCode: 'EXCLUSIVITY_FEE',
        componentName: 'Global exclusivity fee',
        pricingModel: 'FLAT',
        chargeType: 'ONE_TIME',
        billingPeriod: null,
        metric: 'FIXED',
        currency: 'CAD',
        contractAmountMinor: 2500n,
        displayOrder: 2,
      },
    });
    const exclusivity = await prisma.contractExclusivity.create({
      data: {
        contractRevisionId: r.id,
        territoryType: 'REGION',
        territoryCode: 'QC-EAST',
        territoryLabel: 'Québec Est',
        startsAt: new Date('2026-01-01'),
        hasEconomicImpact: true,
        economicSnapshotLineId: exclusivityFee.id,
      },
    });
    const document = await prisma.organizationContractDocument.create({
      data: {
        contractId: c.id,
        contractRevisionId: r.id,
        type: 'SIGNED_CONTRACT',
        fileName: 'contract.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 42,
        storageKey: `contracts/${s}/contract.pdf`,
        sha256: 'a'.repeat(64),
      },
    });
    await prisma.organizationContractRevision.update({
      where: { id: r.id },
      data: { status: 'SIGNED', signedAt: new Date() },
    });
    await expect(
      prisma.organizationContractRevision.update({
        where: { id: r.id },
        data: { changeSummary: 'forbidden' },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.organizationContractRevision.delete({ where: { id: r.id } }),
    ).rejects.toThrow();
    await expect(
      prisma.contractPricingAdjustment.update({
        where: { id: a.id },
        data: { discountBasisPoints: 500 },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.contractPriceSnapshotLine.update({
        where: { id: line.id },
        data: { contractAmountMinor: 1n },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.contractPriceSnapshotTier.update({
        where: { id: tier.id },
        data: { contractAmountMinor: 1n },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.contractMinimumCommitment.update({
        where: { id: commitment.id },
        data: { amountMinor: 1n },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.contractExclusivity.update({
        where: { id: exclusivity.id },
        data: { territoryLabel: 'forbidden' },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.organizationContractDocument.update({
        where: { id: document.id },
        data: { fileName: 'forbidden.pdf' },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.organizationContractDocument.delete({
        where: { id: document.id },
      }),
    ).rejects.toThrow();
  });
  it('allows only one primary ACTIVE contract', async () => {
    await prisma.organizationContract.update({
      where: { id: contract },
      data: { status: 'ACTIVE', activatedAt: new Date() },
    });
    const results = await Promise.allSettled(
      [1, 2].map((i) =>
        prisma.organizationContract.create({
          data: {
            organizationId: org,
            reference: `P2B-CONCURRENT-${i}-${s}`,
            title: 'Concurrent',
            isPrimary: true,
            status: 'ACTIVE',
            activatedAt: new Date(),
          },
        }),
      ),
    );
    expect(results.filter((x) => x.status === 'fulfilled')).toHaveLength(0);
    expect(
      await prisma.organizationContract.count({
        where: { organizationId: org, isPrimary: true, status: 'ACTIVE' },
      }),
    ).toBe(1);
  });
  it('keeps BigInt snapshots and nullable exclusivity capability', async () => {
    const line = await prisma.contractPriceSnapshotLine.findFirstOrThrow({
      where: { contractRevisionId: revision },
    });
    expect(line.contractAmountMinor).toBe(9000n);
    const exclusivityFee =
      await prisma.contractPriceSnapshotLine.findFirstOrThrow({
        where: { contractRevisionId: revision, source: 'EXCLUSIVITY_FEE' },
      });
    expect(exclusivityFee.capabilityId).toBeNull();
    expect(exclusivityFee.contractAmountMinor).toBe(2500n);
    expect(adjustment).toBeTruthy();
  });
});
