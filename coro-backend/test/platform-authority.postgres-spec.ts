import { ForbiddenException } from '@nestjs/common';
import { PlatformPermission, PlatformPermissionScope } from '@prisma/client';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { PlatformAuthorityService } from '../src/auth/platform-authority.service';
import { PrismaService } from '../src/prisma/prisma.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Platform operator authority on PostgreSQL', () => {
  const prisma = databaseUrl
    ? new PrismaService({ datasources: { db: { url: databaseUrl } } })
    : new PrismaService();
  const service = new PlatformAuthorityService(prisma, new AdminAuditService());
  let priorSuperAdmins: Array<{ id: string }> = [];

  beforeAll(async () => {
    await prisma.$connect();
    priorSuperAdmins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN', isActive: true },
      select: { id: true },
    });
    if (priorSuperAdmins.length)
      await prisma.user.updateMany({
        where: { id: { in: priorSuperAdmins.map(({ id }) => id) } },
        data: { role: 'ADMIN' },
      });
  });
  afterAll(async () => {
    if (priorSuperAdmins.length)
      await prisma.user.updateMany({
        where: { id: { in: priorSuperAdmins.map(({ id }) => id) } },
        data: { role: 'SUPER_ADMIN' },
      });
    await prisma.$disconnect();
  });

  it('bootstraps explicitly, delegates by scope, revokes immediately and enforces immutability', async () => {
    const suffix = Date.now().toString();
    const operator = await prisma.organization.create({
      data: { name: `CORO QA ${suffix}`, isInternal: true },
    });
    const customer = await prisma.organization.create({
      data: { name: `Customer QA ${suffix}`, isInternal: false },
    });
    const founder = await prisma.user.create({
      data: {
        email: `founder-${suffix}@example.invalid`,
        password: 'synthetic-not-a-real-secret',
        firstName: 'QA',
        lastName: 'Founder',
        role: 'SUPER_ADMIN',
        organizationId: operator.id,
      },
    });
    const employee = await prisma.user.create({
      data: {
        email: `employee-${suffix}@example.invalid`,
        password: 'synthetic-not-a-real-secret',
        firstName: 'QA',
        lastName: 'Employee',
        role: 'ADMIN',
        organizationId: operator.id,
      },
    });
    const customerAdmin = await prisma.user.create({
      data: {
        email: `customer-${suffix}@example.invalid`,
        password: 'synthetic-not-a-real-secret',
        firstName: 'QA',
        lastName: 'Customer',
        role: 'ADMIN',
        organizationId: customer.id,
      },
    });

    await expect(
      service.requirePermission(
        { userId: customerAdmin.id },
        PlatformPermission.FINANCIAL_RENDEMENT_READ,
        customer.id,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const draft = await service.createDraft(
      { userId: founder.id },
      {
        operatorOrganizationId: operator.id,
        founderUserId: founder.id,
        reason: 'QA explicit bootstrap verification',
      },
    );
    await expect(
      service.requirePermission(
        { userId: founder.id },
        PlatformPermission.COMMERCIAL_CATALOG_MANAGE,
      ),
    ).resolves.toMatchObject({ kind: 'LEGACY_SUPER_ADMIN' });

    await service.activate(
      { userId: founder.id },
      draft.lockVersion,
      'QA transactional activation verification',
    );
    await expect(
      service.requirePermission(
        { userId: founder.id },
        PlatformPermission.COMMERCIAL_CATALOG_MANAGE,
      ),
    ).resolves.toMatchObject({ kind: 'FOUNDER' });

    const grant = await service.createGrant(
      { userId: founder.id },
      {
        userId: employee.id,
        permission: PlatformPermission.FINANCIAL_RENDEMENT_READ,
        scope: PlatformPermissionScope.ORGANIZATION,
        targetOrganizationId: customer.id,
        reason: 'QA scoped delegation verification',
      },
    );
    await expect(
      service.requirePermission(
        { userId: employee.id },
        PlatformPermission.FINANCIAL_RENDEMENT_READ,
        customer.id,
      ),
    ).resolves.toMatchObject({ kind: 'DELEGATED' });
    await expect(
      service.requirePermission(
        { userId: employee.id },
        PlatformPermission.FINANCIAL_RENDEMENT_READ,
        operator.id,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await service.revokeGrant(
      { userId: founder.id },
      grant.id,
      grant.lockVersion,
      'QA immediate revocation verification',
    );
    await expect(
      service.requirePermission(
        { userId: employee.id },
        PlatformPermission.FINANCIAL_RENDEMENT_READ,
        customer.id,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      prisma.platformAuthorityConfiguration.delete({
        where: { id: 'PRIMARY' },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.platformPermissionGrant.delete({ where: { id: grant.id } }),
    ).rejects.toThrow();
  });
});
