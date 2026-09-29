import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { CapabilityEntitlementsService } from '../src/capability-entitlements/capability-entitlements.service';
import { EntitlementResolver } from '../src/capability-entitlements/entitlement-resolver.service';
const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error('TEST_DATABASE_URL jetable obligatoire pour Phase 2C');
describe('Phase 2C PostgreSQL invariants', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const resolver = new EntitlementResolver(prisma as never);
  const service = new CapabilityEntitlementsService(
    prisma as never,
    new AdminAuditService(),
    resolver,
  );
  const s = randomUUID();
  const direct = `p2c-direct-${s}`;
  const partner = `p2c-partner-${s}`;
  const internal = `p2c-internal-${s}`;
  const actor = `p2c-user-${s}`;
  let client = '';
  let site = '';
  let parent = '';
  let child = '';
  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.createMany({
      data: [
        { id: direct, name: 'Direct', commercialRelationship: 'DIRECT' },
        { id: partner, name: 'Partner', commercialRelationship: 'PARTNER' },
        {
          id: internal,
          name: 'Internal',
          commercialRelationship: 'INTERNAL',
          isInternal: true,
        },
      ],
    });
    await prisma.user.create({
      data: {
        id: actor,
        email: `${s}@example.invalid`,
        password: 'x',
        firstName: 'P2C',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        organizationId: direct,
      },
    });
    const c = await prisma.client.create({
      data: {
        name: 'BGO',
        regulatoryRequirements: [],
        organizationId: partner,
      },
    });
    client = c.id;
    const b = await prisma.building.create({
      data: {
        name: '1250 René-Lévesque',
        address: '1250 René-Lévesque',
        city: 'Montréal',
        province: 'QC',
        organizationId: partner,
        clientId: client,
      },
    });
    site = b.id;
  });
  afterAll(() => prisma.$disconnect());
  const base = (
    capabilityCode: string,
    scope: 'ORGANIZATION' | 'CLIENT' | 'SITE',
    source: 'MANUAL_OVERRIDE' | 'INTERNAL' | 'DISTRIBUTION',
    reason: string,
  ) => ({
    capabilityCode,
    scope,
    source,
    provenanceReason: reason,
    enabled: true,
    distributable: false,
    decisionAt: new Date().toISOString(),
    effectiveFrom: new Date(Date.now() - 1000).toISOString(),
    effectiveUntil:
      source === 'MANUAL_OVERRIDE'
        ? new Date(Date.now() + 30 * 86400000).toISOString()
        : undefined,
    reason,
  });
  it('migration creates zero entitlement rows', async () => {
    const [migration] = await prisma.$queryRaw<
      Array<{ finishedAt: Date }>
    >`SELECT "finished_at" AS "finishedAt" FROM "_prisma_migrations" WHERE "migration_name"='20260930010000_super_admin_v2_phase_2c_capability_entitlements' AND "finished_at" IS NOT NULL`;
    expect(migration).toBeDefined();
    await expect(
      prisma.capabilityEntitlement.count({
        where: { createdAt: { lte: migration.finishedAt } },
      }),
    ).resolves.toBe(0);
    await expect(
      prisma.capabilityEntitlementRevision.count({
        where: { recordedAt: { lte: migration.finishedAt } },
      }),
    ).resolves.toBe(0);
    await expect(
      prisma.capabilityEntitlementLimit.count({
        where: { createdAt: { lte: migration.finishedAt } },
      }),
    ).resolves.toBe(0);
  });
  it('supports direct, override and INTERNAL grants with calculated licensed', async () => {
    const capability = await prisma.commercialCapability.findUniqueOrThrow({
      where: { code: 'COMPLIANCE_OPERATIONS' },
    });
    const book = await prisma.priceBook.create({
      data: {
        code: `P2C_${s.replace(/-/g, '').slice(0, 12).toUpperCase()}`,
        name: 'P2C',
        audience: 'DIRECT',
        currency: 'CAD',
      },
    });
    const version = await prisma.priceBookVersion.create({
      data: {
        priceBookId: book.id,
        versionNumber: 1,
        status: 'ACTIVE',
        effectiveFrom: new Date('2026-01-01'),
        publishedAt: new Date(),
      },
    });
    const contract = await prisma.organizationContract.create({
      data: {
        organizationId: direct,
        reference: `P2C-${s}`,
        title: 'P2C',
        status: 'ACTIVE',
        isPrimary: true,
        activatedAt: new Date(),
      },
    });
    const revision = await prisma.organizationContractRevision.create({
      data: {
        contractId: contract.id,
        revisionNumber: 1,
        revisionType: 'INITIAL',
        status: 'DRAFT',
        priceBookVersionId: version.id,
        currency: 'CAD',
        effectiveFrom: new Date('2026-01-01'),
        termStartAt: new Date('2026-01-01'),
      },
    });
    const snapshot = await prisma.contractPriceSnapshotLine.create({
      data: {
        contractRevisionId: revision.id,
        source: 'CUSTOM_COMPONENT',
        capabilityId: capability.id,
        componentCode: 'COMPLIANCE',
        componentName: 'Compliance',
        pricingModel: 'FLAT',
        chargeType: 'RECURRING',
        billingPeriod: 'MONTH',
        metric: 'FIXED',
        currency: 'CAD',
        contractAmountMinor: 0n,
        displayOrder: 1,
      },
    });
    await prisma.organizationContractRevision.update({
      where: { id: revision.id },
      data: { status: 'SIGNED', signedAt: new Date() },
    });
    await service.create(
      direct,
      {
        ...base(
          'COMPLIANCE_OPERATIONS',
          'ORGANIZATION',
          'MANUAL_OVERRIDE',
          'Contract compliance',
        ),
        source: 'CONTRACT',
        provenanceReason: undefined,
        sourceContractId: contract.id,
        sourceContractRevisionId: revision.id,
        sourceSnapshotLineId: snapshot.id,
        effectiveUntil: undefined,
      },
      { userId: actor },
    );
    await service.create(
      direct,
      base('AI', 'ORGANIZATION', 'MANUAL_OVERRIDE', 'AI pilot 30 days'),
      { userId: actor },
    );
    await service.create(
      internal,
      {
        ...base('KNOWLEDGE', 'ORGANIZATION', 'INTERNAL', 'Internal operations'),
        effectiveUntil: undefined,
      },
      { userId: actor },
    );
    await service.create(
      partner,
      {
        ...base('AI', 'ORGANIZATION', 'MANUAL_OVERRIDE', 'Partner AI'),
        effectiveUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
      { userId: actor },
    );
    await service.create(
      direct,
      {
        ...base('KNOWLEDGE', 'ORGANIZATION', 'MANUAL_OVERRIDE', 'Trial'),
        source: 'TRIAL',
      },
      { userId: actor },
    );
    const resolved = await resolver.resolve({
      capabilityCode: 'AI',
      organizationId: direct,
      observed: false,
    });
    expect(resolved).toMatchObject({
      licensed: true,
      enabled: true,
      mismatch: 'ENTITLED_NOT_OBSERVED',
    });
    expect(resolved.contributingGrants).toHaveLength(1);
  });
  it('supports Partner distribution and preserves invalid children', async () => {
    const p = await service.create(
      partner,
      {
        ...base(
          'SENTINELLE',
          'ORGANIZATION',
          'MANUAL_OVERRIDE',
          'Partner grant',
        ),
        enabled: false,
        distributable: true,
      },
      { userId: actor },
    );
    parent = p.id;
    const c = await service.create(
      partner,
      {
        ...base('SENTINELLE', 'SITE', 'DISTRIBUTION', 'Distributed to BGO'),
        provenanceReason: undefined,
        parentEntitlementId: parent,
        clientId: client,
        buildingId: site,
      },
      { userId: actor },
    );
    child = c.id;
    expect(
      (
        await resolver.resolve({
          capabilityCode: 'SENTINELLE',
          organizationId: partner,
          clientId: client,
          buildingId: site,
        })
      ).licensed,
    ).toBe(true);
    await service.transition(
      partner,
      parent,
      'REVOKED',
      {
        lockVersion: 0,
        decisionAt: new Date().toISOString(),
        effectiveFrom: new Date(Date.now() - 1).toISOString(),
        reason: 'Partner revoked',
      },
      { userId: actor },
      'ENTITLEMENT_REVOKED',
    );
    const invalid = await resolver.resolve({
      capabilityCode: 'SENTINELLE',
      organizationId: partner,
      clientId: client,
      buildingId: site,
    });
    expect(invalid.grants[0].effectiveState).toBe('PARENT_INVALID');
    expect(
      await prisma.capabilityEntitlement.count({ where: { id: child } }),
    ).toBe(1);
  });
  it('enforces composite tenant/scope/availability and direct distribution', async () => {
    await expect(
      service.create(
        direct,
        {
          ...base('SENTINELLE', 'SITE', 'MANUAL_OVERRIDE', 'Wrong tenant'),
          clientId: client,
          buildingId: site,
        },
        { userId: actor },
      ),
    ).rejects.toThrow();
    await expect(
      service.create(
        direct,
        base('CAMPUS', 'ORGANIZATION', 'MANUAL_OVERRIDE', 'Unavailable'),
        { userId: actor },
      ),
    ).rejects.toThrow();
    const directParent = await service.create(
      direct,
      {
        ...base('SENTINELLE', 'ORGANIZATION', 'MANUAL_OVERRIDE', 'Direct'),
        distributable: false,
      },
      { userId: actor },
    );
    await expect(
      service.create(
        direct,
        {
          ...base('SENTINELLE', 'SITE', 'DISTRIBUTION', 'Forbidden'),
          parentEntitlementId: directParent.id,
          clientId: client,
          buildingId: site,
        },
        { userId: actor },
      ),
    ).rejects.toThrow();
  });
  it('protects root, revisions and limits through direct Prisma access', async () => {
    const grant = await service.create(
      direct,
      {
        ...base('PERFORMANCE', 'ORGANIZATION', 'MANUAL_OVERRIDE', 'Immutable'),
        limits: [{ type: 'SEATS', unlimited: false, quantity: '10' }],
      },
      { userId: actor },
    );
    const revision = grant.revisions[0];
    const limit = revision.limits[0];
    await expect(
      prisma.capabilityEntitlement.update({
        where: { id: grant.id },
        data: { provenanceReason: 'changed' },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.capabilityEntitlement.delete({ where: { id: grant.id } }),
    ).rejects.toThrow();
    await expect(
      prisma.capabilityEntitlementRevision.update({
        where: { id: revision.id },
        data: { enabled: false },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.capabilityEntitlementRevision.delete({
        where: { id: revision.id },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.capabilityEntitlementLimit.update({
        where: { id: limit.id },
        data: { quantity: 11 },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.capabilityEntitlementLimit.delete({ where: { id: limit.id } }),
    ).rejects.toThrow();
    await expect(
      prisma.capabilityEntitlementLimit.create({
        data: {
          entitlementRevisionId: revision.id,
          type: 'SITES',
          unlimited: false,
          quantity: 1,
        },
      }),
    ).rejects.toThrow();
  });
  it('detects NOT_ENTITLED_OBSERVED without operational mutation', async () => {
    const result = await resolver.resolve({
      capabilityCode: 'INCIDENT',
      organizationId: internal,
      observed: true,
    });
    expect(result).toMatchObject({
      licensed: false,
      mismatch: 'NOT_ENTITLED_OBSERVED',
    });
  });
  it('serializes concurrent revision appends with lockVersion', async () => {
    const grant = await service.create(
      direct,
      base('INCIDENT', 'ORGANIZATION', 'MANUAL_OVERRIDE', 'Concurrency'),
      { userId: actor },
    );
    const dto = {
      lockVersion: 0,
      decisionAt: new Date().toISOString(),
      effectiveFrom: new Date().toISOString(),
      reason: 'Concurrent change',
      enabled: false,
    };
    const results = await Promise.allSettled([
      service.transition(
        direct,
        grant.id,
        'GRANTED',
        dto,
        { userId: actor },
        'ENTITLEMENT_DISABLED',
      ),
      service.transition(
        direct,
        grant.id,
        'GRANTED',
        dto,
        { userId: actor },
        'ENTITLEMENT_DISABLED',
      ),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      await prisma.capabilityEntitlementRevision.count({
        where: { entitlementId: grant.id },
      }),
    ).toBe(2);
  });
});
