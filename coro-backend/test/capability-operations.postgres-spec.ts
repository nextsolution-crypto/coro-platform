import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { EntitlementCommandService } from '../src/capability-entitlements/entitlement-command.service';
import { EntitlementResolver } from '../src/capability-entitlements/entitlement-resolver.service';
import { CapabilityObservationService } from '../src/control-center/capability-observation.service';

const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error('TEST_DATABASE_URL jetable obligatoire pour Phase 3B');

describe('Phase 3B PostgreSQL capability operations', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const resolver = new EntitlementResolver(prisma as never);
  const observation = new CapabilityObservationService(prisma as never);
  const commands = new EntitlementCommandService(
    prisma as never,
    new AdminAuditService(),
    resolver,
    observation,
  );
  const suffix = randomUUID();
  const organizationId = `p3b-${suffix}`;
  const partnerId = `p3b-partner-${suffix}`;
  const actorId = `p3b-user-${suffix}`;
  let partnerClientId = '';
  let partnerSiteId = '';
  let contractId = '';
  let contractRevisionId = '';
  const contractSnapshotIds: string[] = [];
  const contractFrom = new Date(Date.now() - 60000);
  const contractUntil = new Date(Date.now() + 20 * 86400000);

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.create({
      data: {
        id: organizationId,
        name: 'Phase 3B Direct',
        commercialRelationship: 'DIRECT',
      },
    });
    await prisma.organization.create({
      data: {
        id: partnerId,
        name: 'Phase 3B Partner',
        commercialRelationship: 'PARTNER',
      },
    });
    await prisma.user.create({
      data: {
        id: actorId,
        email: `${suffix}@phase3b.invalid`,
        password: 'x',
        firstName: 'Phase',
        lastName: 'ThreeB',
        role: 'SUPER_ADMIN',
        organizationId,
      },
    });
    const client = await prisma.client.create({
      data: {
        name: 'Phase 3B Partner client',
        regulatoryRequirements: [],
        organizationId: partnerId,
      },
    });
    partnerClientId = client.id;
    const site = await prisma.building.create({
      data: {
        name: 'Phase 3B Partner site',
        address: '1 Test Street',
        city: 'Montreal',
        province: 'QC',
        organizationId: partnerId,
        clientId: client.id,
      },
    });
    partnerSiteId = site.id;
    const book = await prisma.priceBook.create({
      data: {
        code: `P3B_${suffix.replace(/-/g, '').slice(0, 12).toUpperCase()}`,
        name: 'Phase 3B contract authority',
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
        organizationId,
        reference: `P3B-${suffix}`,
        title: 'Phase 3B contract',
        status: 'ACTIVE',
        isPrimary: true,
        activatedAt: new Date(),
      },
    });
    contractId = contract.id;
    const revision = await prisma.organizationContractRevision.create({
      data: {
        contractId,
        revisionNumber: 1,
        revisionType: 'INITIAL',
        status: 'DRAFT',
        priceBookVersionId: version.id,
        currency: 'CAD',
        effectiveFrom: contractFrom,
        effectiveUntil: contractUntil,
        termStartAt: contractFrom,
      },
    });
    contractRevisionId = revision.id;
    const sentinel = await prisma.commercialCapability.findUniqueOrThrow({
      where: { code: 'SENTINELLE' },
    });
    for (let index = 0; index < 6; index += 1) {
      const snapshot = await prisma.contractPriceSnapshotLine.create({
        data: {
          contractRevisionId,
          source: 'CUSTOM_COMPONENT',
          capabilityId: sentinel.id,
          componentCode: `P3B_${index}_${suffix}`,
          componentName: 'Phase 3B authority',
          pricingModel: 'FLAT',
          chargeType: 'RECURRING',
          billingPeriod: 'MONTH',
          metric: 'FIXED',
          currency: 'CAD',
          contractAmountMinor: 0n,
          displayOrder: index,
          internalUse: index !== 5,
          distributable: index !== 5,
          distributionLimit: index === 5 ? null : 50,
          distributionMetric: index === 5 ? null : 'SITE',
        },
      });
      contractSnapshotIds.push(snapshot.id);
    }
    await prisma.organizationContractRevision.update({
      where: { id: revision.id },
      data: { status: 'SIGNED', signedAt: new Date() },
    });
  });
  afterAll(() => prisma.$disconnect());

  const limit = (quantity: string, unlimited = false) => ({
    type: 'SITES' as const,
    metricCode: 'DEFAULT',
    unlimited,
    quantity: unlimited ? null : quantity,
    periodStart: null,
    periodEnd: null,
  });

  const contractCommand = (
    snapshotIndex: number,
    overrides: Partial<Parameters<typeof commands.execute>[0]> = {},
  ) => ({
    operation: 'PROVISION_CONTRACT' as const,
    organizationId,
    capabilityCode: 'SENTINELLE',
    scope: 'ORGANIZATION' as const,
    source: 'CONTRACT' as const,
    sourceContractId: contractId,
    sourceContractRevisionId: contractRevisionId,
    sourceSnapshotLineId: contractSnapshotIds[snapshotIndex],
    enabled: true,
    distributable: false,
    effectiveFrom: new Date(),
    effectiveUntil: new Date(Date.now() + 10 * 86400000),
    limits: [limit('40')],
    reason: 'Phase 3B contract provisioning',
    acknowledgedWarningCodes: [],
    ...overrides,
  });

  async function createPartnerParent() {
    const now = new Date();
    const result = await commands.execute(
      {
        operation: 'CREATE_MANUAL_OVERRIDE',
        organizationId: partnerId,
        capabilityCode: 'SENTINELLE',
        scope: 'ORGANIZATION',
        source: 'MANUAL_OVERRIDE',
        provenanceReason: 'Phase 3B distribution authority',
        enabled: false,
        distributable: true,
        effectiveFrom: now,
        effectiveUntil: new Date(now.getTime() + 20 * 86400000),
        limits: [limit('50')],
        reason: 'Phase 3B distribution authority',
        acknowledgedWarningCodes: [],
      },
      { userId: actorId },
    );
    if (!('entitlement' in result)) throw new Error('Expected parent grant');
    return result.entitlement;
  }

  const distributionCommand = (
    parentId: string,
    effectiveFrom: Date,
    overrides: Partial<Parameters<typeof commands.execute>[0]> = {},
  ) => ({
    operation: 'DISTRIBUTE' as const,
    organizationId: partnerId,
    capabilityCode: 'SENTINELLE',
    scope: 'SITE' as const,
    clientId: partnerClientId,
    buildingId: partnerSiteId,
    source: 'DISTRIBUTION' as const,
    parentEntitlementId: parentId,
    enabled: true,
    distributable: false,
    effectiveFrom,
    effectiveUntil: new Date(effectiveFrom.getTime() + 10 * 86400000),
    limits: [limit('40')],
    reason: 'Phase 3B child distribution',
    acknowledgedWarningCodes: [],
    ...overrides,
  });

  it('preserves full limit snapshots and rejects stale concurrent commands', async () => {
    const now = new Date();
    const created = await commands.execute(
      {
        operation: 'CREATE_MANUAL_OVERRIDE',
        organizationId,
        capabilityCode: 'PERFORMANCE',
        scope: 'ORGANIZATION',
        source: 'MANUAL_OVERRIDE',
        provenanceReason: 'Temporary performance exception',
        enabled: true,
        distributable: false,
        effectiveFrom: now,
        effectiveUntil: new Date(now.getTime() + 20 * 86400000),
        limits: [
          {
            type: 'SEATS',
            metricCode: 'DEFAULT',
            unlimited: false,
            quantity: '10',
            periodStart: null,
            periodEnd: null,
          },
        ],
        reason: 'Temporary performance exception',
        acknowledgedWarningCodes: [],
      },
      { userId: actorId },
    );
    if (!('entitlement' in created))
      throw new Error('Expected a newly created entitlement');
    const entitlement = await prisma.capabilityEntitlement.findUniqueOrThrow({
      where: { id: created.entitlement.id },
      include: {
        revisions: {
          orderBy: { versionNumber: 'desc' },
          include: { limits: true },
        },
      },
    });
    const first = entitlement.revisions[0];
    const command = {
      operation: 'DISABLE' as const,
      organizationId,
      entitlementId: entitlement.id,
      effectiveFrom: new Date(),
      reason: 'Commercial disable only',
      expectedLockVersion: entitlement.lockVersion,
      expectedRevisionId: first.id,
      acknowledgedWarningCodes: [],
    };
    const beforePreview = await prisma.capabilityEntitlementRevision.count({
      where: { entitlementId: entitlement.id },
    });
    await commands.preview(command);
    expect(
      await prisma.capabilityEntitlementRevision.count({
        where: { entitlementId: entitlement.id },
      }),
    ).toBe(beforePreview);
    await commands.execute(command, { userId: actorId });
    const revisions = await prisma.capabilityEntitlementRevision.findMany({
      where: { entitlementId: entitlement.id },
      orderBy: { versionNumber: 'asc' },
      include: { limits: true },
    });
    expect(revisions).toHaveLength(2);
    expect(
      revisions[1].limits.map((limit) => limit.quantity?.toString()),
    ).toEqual(['10']);
    await expect(
      commands.execute(command, { userId: actorId }),
    ).rejects.toThrow('STALE_ENTITLEMENT_PREVIEW');
  });

  it('keeps CONTRACT limits and dates within snapshot authority on create and transition', async () => {
    await expect(
      commands.preview(
        contractCommand(0, {
          effectiveFrom: new Date(contractFrom.getTime() + 1000),
          effectiveUntil: new Date(contractUntil.getTime() - 1000),
        }),
      ),
    ).resolves.toBeDefined();
    await expect(
      commands.preview(
        contractCommand(0, {
          effectiveFrom: contractFrom,
          effectiveUntil: contractUntil,
          limits: [limit('50')],
        }),
      ),
    ).resolves.toBeDefined();
    await expect(
      commands.preview(
        contractCommand(0, {
          effectiveFrom: new Date(contractFrom.getTime() - 1000),
        }),
      ),
    ).rejects.toThrow('CONTRACT_DATES_EXCEEDED');
    await expect(
      commands.preview(contractCommand(0, { effectiveUntil: null })),
    ).rejects.toThrow('CONTRACT_DATES_EXCEEDED');
    await expect(
      commands.preview(contractCommand(0, { limits: [limit('51')] })),
    ).rejects.toThrow('CONTRACT_LIMIT_EXCEEDED');
    await expect(
      commands.preview(contractCommand(0, { limits: [limit('50', true)] })),
    ).rejects.toThrow('CONTRACT_LIMIT_EXCEEDED');
    await expect(
      commands.preview(
        contractCommand(0, {
          effectiveUntil: new Date(contractUntil.getTime() + 1),
        }),
      ),
    ).rejects.toThrow('CONTRACT_DATES_EXCEEDED');
    const created = await commands.execute(contractCommand(0), {
      userId: actorId,
    });
    if (!('entitlement' in created)) throw new Error('Expected contract grant');
    const grant = await prisma.capabilityEntitlement.findUniqueOrThrow({
      where: { id: created.entitlement.id },
      include: { revisions: { orderBy: { versionNumber: 'desc' } } },
    });
    const state = {
      organizationId,
      entitlementId: grant.id,
      expectedLockVersion: grant.lockVersion,
      expectedRevisionId: grant.revisions[0].id,
      effectiveFrom: new Date(),
      reason: 'Attempt to exceed contract',
      acknowledgedWarningCodes: [],
    };
    await expect(
      commands.preview({
        ...state,
        operation: 'CHANGE_LIMITS',
        removeAllLimits: true,
      }),
    ).rejects.toThrow('CONTRACT_LIMIT_EXCEEDED');
    await expect(
      commands.preview({
        ...state,
        operation: 'CHANGE_DATES',
        effectiveUntil: new Date(contractUntil.getTime() + 1),
      }),
    ).rejects.toThrow('CONTRACT_DATES_EXCEEDED');
    await expect(
      commands.preview({
        ...state,
        operation: 'CHANGE_LIMITS',
        limits: [limit('50')],
      }),
    ).resolves.toBeDefined();
    await expect(
      commands.preview({
        ...state,
        operation: 'CHANGE_LIMITS',
        limits: [limit('40')],
      }),
    ).resolves.toBeDefined();
  });

  it('revalidates DISTRIBUTION limits and dates on creation and later mutations', async () => {
    const parent = await createPartnerParent();
    const now = new Date();
    await expect(
      commands.preview(
        distributionCommand(parent.id, now, { limits: [limit('50')] }),
      ),
    ).resolves.toBeDefined();
    await expect(
      commands.preview(
        distributionCommand(parent.id, now, { limits: [limit('51')] }),
      ),
    ).rejects.toThrow('DISTRIBUTION_LIMIT_EXCEEDED');
    await expect(
      commands.preview(
        distributionCommand(parent.id, now, { limits: [limit('50', true)] }),
      ),
    ).rejects.toThrow('DISTRIBUTION_LIMIT_EXCEEDED');
    const parentState = await prisma.capabilityEntitlement.findUniqueOrThrow({
      where: { id: parent.id },
      include: { revisions: true },
    });
    await expect(
      commands.preview(
        distributionCommand(
          parent.id,
          new Date(parentState.revisions[0].effectiveFrom.getTime() - 1),
        ),
      ),
    ).rejects.toThrow('DISTRIBUTION_PARENT_INVALID');
    await expect(
      commands.preview(
        distributionCommand(parent.id, now, { effectiveUntil: null }),
      ),
    ).rejects.toThrow('DISTRIBUTION_DATES_EXCEED_PARENT');
    const created = await commands.execute(
      distributionCommand(parent.id, now),
      {
        userId: actorId,
      },
    );
    if (!('entitlement' in created)) throw new Error('Expected child grant');
    const child = await prisma.capabilityEntitlement.findUniqueOrThrow({
      where: { id: created.entitlement.id },
      include: { revisions: { orderBy: { versionNumber: 'desc' } } },
    });
    const state = {
      organizationId: partnerId,
      entitlementId: child.id,
      expectedLockVersion: child.lockVersion,
      expectedRevisionId: child.revisions[0].id,
      effectiveFrom: new Date(),
      reason: 'Attempt to exceed parent',
      acknowledgedWarningCodes: [],
    };
    await expect(
      commands.preview({
        ...state,
        operation: 'CHANGE_LIMITS',
        removeAllLimits: true,
      }),
    ).rejects.toThrow('DISTRIBUTION_LIMIT_EXCEEDED');
    await expect(
      commands.preview({
        ...state,
        operation: 'CHANGE_DATES',
        effectiveUntil: new Date(now.getTime() + 21 * 86400000),
      }),
    ).rejects.toThrow('DISTRIBUTION_DATES_EXCEED_PARENT');
    await expect(
      commands.preview({
        ...state,
        operation: 'SET_DISTRIBUTABLE',
        distributable: true,
      }),
    ).rejects.toThrow('DISTRIBUTABLE_PARTNER_ORGANIZATION_ONLY');
  });

  it('revalidates CONTRACT internal-use and distribution authority on transitions', async () => {
    const created = await commands.execute(
      contractCommand(5, {
        enabled: false,
        distributable: false,
        limits: [],
      }),
      { userId: actorId },
    );
    if (!('entitlement' in created)) throw new Error('Expected contract grant');
    const grant = await prisma.capabilityEntitlement.findUniqueOrThrow({
      where: { id: created.entitlement.id },
      include: { revisions: true },
    });
    const state = {
      organizationId,
      entitlementId: grant.id,
      expectedLockVersion: grant.lockVersion,
      expectedRevisionId: grant.revisions[0].id,
      effectiveFrom: new Date(),
      reason: 'Attempt to exceed contract flags',
      acknowledgedWarningCodes: [],
    };
    await expect(
      commands.preview({ ...state, operation: 'ENABLE' }),
    ).rejects.toThrow('CONTRACT_INTERNAL_USE_EXCEEDED');
    await expect(
      commands.preview({
        ...state,
        operation: 'SET_DISTRIBUTABLE',
        distributable: true,
      }),
    ).rejects.toThrow('CONTRACT_DISTRIBUTION_EXCEEDED');
  });

  it('makes CONTRACT provisioning semantically idempotent under concurrency', async () => {
    const command = contractCommand(1);
    const beforeAudit = await prisma.adminAuditEvent.count({
      where: {
        organizationId,
        action: 'ENTITLEMENT_PROVISIONED_FROM_CONTRACT',
      },
    });
    const results = await Promise.all([
      commands.execute(command, { userId: actorId }),
      commands.execute(command, { userId: actorId }),
    ]);
    if (!('entitlement' in results[0]) || !('entitlement' in results[1]))
      throw new Error('Expected contract provisioning results');
    expect(results[0].entitlement.id).toBe(results[1].entitlement.id);
    expect(
      await prisma.capabilityEntitlement.count({
        where: { sourceSnapshotLineId: contractSnapshotIds[1] },
      }),
    ).toBe(1);
    expect(
      await prisma.adminAuditEvent.count({
        where: {
          organizationId,
          action: 'ENTITLEMENT_PROVISIONED_FROM_CONTRACT',
        },
      }),
    ).toBe(beforeAudit + 1);
    await expect(
      commands.execute(
        {
          ...command,
          effectiveUntil: new Date(command.effectiveUntil!.getTime() - 1),
        },
        { userId: actorId },
      ),
    ).rejects.toThrow('IDEMPOTENT_COMMAND_CONFLICT');
    await expect(
      commands.execute({ ...command, enabled: false }, { userId: actorId }),
    ).rejects.toThrow('IDEMPOTENT_COMMAND_CONFLICT');
    await expect(
      commands.execute(
        { ...command, distributable: true },
        { userId: actorId },
      ),
    ).rejects.toThrow('IDEMPOTENT_COMMAND_CONFLICT');
    await expect(
      commands.execute(
        { ...command, limits: [limit('39')] },
        { userId: actorId },
      ),
    ).rejects.toThrow('IDEMPOTENT_COMMAND_CONFLICT');
  });

  it('makes DISTRIBUTION creation semantically idempotent under concurrency', async () => {
    const parent = await createPartnerParent();
    const command = distributionCommand(parent.id, new Date());
    const results = await Promise.all([
      commands.execute(command, { userId: actorId }),
      commands.execute(command, { userId: actorId }),
    ]);
    if (!('entitlement' in results[0]) || !('entitlement' in results[1]))
      throw new Error('Expected distribution results');
    expect(results[0].entitlement.id).toBe(results[1].entitlement.id);
    expect(
      await prisma.capabilityEntitlement.count({
        where: {
          parentEntitlementId: parent.id,
          buildingId: partnerSiteId,
        },
      }),
    ).toBe(1);
    await expect(
      commands.execute(
        { ...command, limits: [limit('39')] },
        { userId: actorId },
      ),
    ).rejects.toThrow('IDEMPOTENT_COMMAND_CONFLICT');
    await expect(
      commands.execute(
        {
          ...command,
          effectiveUntil: new Date(command.effectiveUntil!.getTime() - 1),
        },
        { userId: actorId },
      ),
    ).rejects.toThrow('IDEMPOTENT_COMMAND_CONFLICT');
  });

  it('serializes a concurrent conflicting CONTRACT retry', async () => {
    const first = contractCommand(2);
    const conflicting = { ...first, limits: [limit('39')] };
    const results = await Promise.allSettled([
      commands.execute(first, { userId: actorId }),
      commands.execute(conflicting, { userId: actorId }),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    expect(
      await prisma.capabilityEntitlement.count({
        where: { sourceSnapshotLineId: contractSnapshotIds[2] },
      }),
    ).toBe(1);
  });

  it('serializes a concurrent conflicting DISTRIBUTION retry', async () => {
    const parent = await createPartnerParent();
    const first = distributionCommand(parent.id, new Date());
    const conflicting = { ...first, limits: [limit('39')] };
    const results = await Promise.allSettled([
      commands.execute(first, { userId: actorId }),
      commands.execute(conflicting, { userId: actorId }),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    expect(
      await prisma.capabilityEntitlement.count({
        where: {
          parentEntitlementId: parent.id,
          buildingId: partnerSiteId,
        },
      }),
    ).toBe(1);
  });

  it('keeps Phase 2C append-only database protections active', async () => {
    const grant = await prisma.capabilityEntitlement.findFirstOrThrow({
      where: { organizationId },
      include: { revisions: { include: { limits: true } } },
    });
    await expect(
      prisma.capabilityEntitlement.delete({ where: { id: grant.id } }),
    ).rejects.toThrow();
    await expect(
      prisma.capabilityEntitlementRevision.update({
        where: { id: grant.revisions[0].id },
        data: { enabled: false },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.capabilityEntitlementLimit.delete({
        where: { id: grant.revisions[0].limits[0].id },
      }),
    ).rejects.toThrow();
  });
});
