import { PrismaClient } from '@prisma/client';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { OrganizationContractsService } from '../src/organization-contracts/organization-contracts.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase('Commercial acceptance and activation foundation', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  const fixture = `acceptance_activation_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const service = new OrganizationContractsService(
    prisma as never,
    new AdminAuditService(),
    {} as never,
  );
  let organizationId: string;
  let actorId: string;
  let priceBookVersionId: string;

  beforeAll(async () => {
    const organization = await prisma.organization.create({
      data: {
        name: fixture,
        commercialRelationship: 'DIRECT',
      },
    });
    organizationId = organization.id;
    const actor = await prisma.user.create({
      data: {
        email: `${fixture}@example.invalid`,
        password: 'not-used',
        firstName: 'Foundation',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        organizationId,
      },
    });
    actorId = actor.id;
    const priceBook = await prisma.priceBook.create({
      data: {
        code: fixture.toUpperCase().slice(0, 40),
        name: fixture,
        audience: 'DIRECT',
        currency: 'CAD',
      },
    });
    const version = await prisma.priceBookVersion.create({
      data: {
        priceBookId: priceBook.id,
        versionNumber: 1,
        status: 'ACTIVE',
        publishedAt: new Date(),
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
    priceBookVersionId = version.id;
  });

  afterAll(async () => prisma.$disconnect());

  async function approvedContract(
    referenceSuffix: string,
    effectiveFrom: Date,
  ) {
    const contract = await prisma.organizationContract.create({
      data: {
        organizationId,
        reference: `${fixture}_${referenceSuffix}`,
        title: `Contract ${referenceSuffix}`,
        status: 'APPROVED',
        approvedAt: new Date(),
        isPrimary: false,
      },
    });
    const revision = await prisma.organizationContractRevision.create({
      data: {
        contractId: contract.id,
        revisionNumber: 1,
        revisionType: 'INITIAL',
        status: 'APPROVED',
        approvedAt: new Date(),
        priceBookVersionId,
        currency: 'CAD',
        effectiveFrom,
        termStartAt: effectiveFrom,
      },
    });
    return { contract, revision };
  }

  it('keeps signing separate from explicit activation and entitlements', async () => {
    const { contract, revision } = await approvedContract(
      'PAST',
      new Date('2026-01-01T00:00:00.000Z'),
    );
    const entitlementCount = await prisma.capabilityEntitlement.count({
      where: { organizationId },
    });

    const signed = await service.sign(
      organizationId,
      contract.id,
      revision.id,
      {
        reason: 'Explicit signature evidence',
        lockVersion: 0,
        signedByName: 'Authorized signer',
        signatureReference: `${fixture}:signature`,
      },
      { userId: actorId },
    );
    expect(signed.status).toBe('SCHEDULED');
    expect(signed.activatedAt).toBeNull();
    await expect(
      prisma.capabilityEntitlement.count({ where: { organizationId } }),
    ).resolves.toBe(entitlementCount);

    const activated = await service.contractTransition(
      organizationId,
      contract.id,
      'activate',
      { reason: 'Explicit activation', lockVersion: 1 },
      { userId: actorId },
    );
    expect(activated.status).toBe('ACTIVE');
    expect(activated.activatedAt).toEqual(expect.any(String));
    await expect(
      service.contractTransition(
        organizationId,
        contract.id,
        'activate',
        { reason: 'Duplicate activation', lockVersion: 2 },
        { userId: actorId },
      ),
    ).rejects.toThrow(/invalide/i);
    await expect(
      prisma.capabilityEntitlement.count({ where: { organizationId } }),
    ).resolves.toBe(entitlementCount);
  });

  it('keeps a future signed contract scheduled and refuses early activation', async () => {
    const { contract, revision } = await approvedContract(
      'FUTURE',
      new Date('2099-01-01T00:00:00.000Z'),
    );
    const signed = await service.sign(
      organizationId,
      contract.id,
      revision.id,
      {
        reason: 'Future signature evidence',
        lockVersion: 0,
        signedByName: 'Authorized signer',
        signatureReference: `${fixture}:future-signature`,
      },
      { userId: actorId },
    );
    expect(signed.status).toBe('SCHEDULED');
    await expect(
      service.contractTransition(
        organizationId,
        contract.id,
        'activate',
        { reason: 'Too early', lockVersion: 1 },
        { userId: actorId },
      ),
    ).rejects.toThrow(/applicable/i);
  });

  it('does not reveal a contract across organization boundaries', async () => {
    const other = await prisma.organization.create({
      data: { name: `${fixture}_other`, commercialRelationship: 'DIRECT' },
    });
    const { contract } = await approvedContract(
      'BOUNDARY',
      new Date('2026-01-01T00:00:00.000Z'),
    );
    await expect(service.get(other.id, contract.id)).rejects.toThrow(
      /introuvable/i,
    );
  });

  it('refuses activation when signed evidence is structurally incomplete', async () => {
    const { contract, revision } = await approvedContract(
      'INCOMPLETE_EVIDENCE',
      new Date('2026-01-01T00:00:00.000Z'),
    );
    await prisma.organizationContractRevision.update({
      where: { id: revision.id },
      data: { status: 'SIGNED', signedAt: new Date(), lockVersion: 1 },
    });
    await prisma.organizationContract.update({
      where: { id: contract.id },
      data: { status: 'SCHEDULED', lockVersion: 1 },
    });
    await expect(
      service.contractTransition(
        organizationId,
        contract.id,
        'activate',
        { reason: 'Incomplete evidence', lockVersion: 1 },
        { userId: actorId },
      ),
    ).rejects.toThrow(/applicable/i);
  });
});
