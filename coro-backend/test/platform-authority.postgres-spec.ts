import { ForbiddenException } from '@nestjs/common';
import { PlatformPermission, PlatformPermissionScope } from '@prisma/client';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { PlatformAuthorityService } from '../src/auth/platform-authority.service';
import { AdvisorCostRatesService } from '../src/mandate/advisor-cost-rates.service';
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
    const rates = new AdvisorCostRatesService(prisma, service);
    const financialActor = (user: typeof founder) => ({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
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

    const draftCompatibilityRate = await rates.createDraft(
      {
        organizationId: customer.id,
        userId: customerAdmin.id,
        currency: 'CAD',
        hourlyCost: '80.123456',
        effectiveFrom: '2030-01-01',
      },
      financialActor(founder),
    );
    await expect(
      rates.submit(
        draftCompatibilityRate.id,
        { lockVersion: 0, reason: 'DRAFT compatibility verification' },
        financialActor(founder),
      ),
    ).resolves.toMatchObject({ status: 'PROPOSED', lockVersion: 1 });

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
    const costGrant = await service.createGrant(
      { userId: founder.id },
      {
        userId: employee.id,
        permission: PlatformPermission.FINANCIAL_ADVISOR_COST_MANAGE,
        scope: PlatformPermissionScope.ORGANIZATION,
        targetOrganizationId: customer.id,
        reason: 'QA advisor cost-rate scoped delegation',
      },
    );
    const founderRate = await rates.createDraft(
      {
        organizationId: customer.id,
        userId: customerAdmin.id,
        currency: 'CAD',
        hourlyCost: '90.654321',
        effectiveFrom: '2030-02-01',
      },
      financialActor(founder),
    );
    const founderProposed = await rates.submit(
      founderRate.id,
      { lockVersion: 0, reason: 'Founder governed proposal' },
      financialActor(founder),
    );
    await expect(
      rates.approve(
        founderRate.id,
        { lockVersion: 1, reason: 'Self approval denied' },
        financialActor(founder),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      rates.approve(
        founderRate.id,
        {
          lockVersion: founderProposed.lockVersion,
          reason: 'Independent approval',
        },
        financialActor(employee),
      ),
    ).resolves.toMatchObject({
      status: 'APPROVED',
      currency: 'CAD',
      lockVersion: 2,
    });

    const otherCustomer = await prisma.organization.create({
      data: { name: `Other Financial Customer ${suffix}` },
    });
    const otherAdvisor = await prisma.user.create({
      data: {
        email: `other-advisor-${suffix}@example.invalid`,
        password: 'synthetic-not-a-real-secret',
        firstName: 'QA',
        lastName: 'Other Advisor',
        role: 'OPERATOR',
        organizationId: otherCustomer.id,
      },
    });
    const wrongScopeRate = await rates.createDraft(
      {
        organizationId: otherCustomer.id,
        userId: otherAdvisor.id,
        currency: 'CAD',
        hourlyCost: '70',
        effectiveFrom: '2030-03-01',
      },
      financialActor(founder),
    );
    await expect(
      rates.submit(
        wrongScopeRate.id,
        { lockVersion: 0, reason: 'Wrong scope denial' },
        financialActor(employee),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(
      await prisma.advisorInternalCostRate.findUniqueOrThrow({
        where: { id: wrongScopeRate.id },
      }),
    ).toMatchObject({ status: 'DRAFT', lockVersion: 0 });

    const globalEmployee = await prisma.user.create({
      data: {
        email: `global-financial-${suffix}@example.invalid`,
        password: 'synthetic-not-a-real-secret',
        firstName: 'QA',
        lastName: 'Global Financial',
        role: 'OPERATOR',
        organizationId: operator.id,
      },
    });
    await service.createGrant(
      { userId: founder.id },
      {
        userId: globalEmployee.id,
        permission: PlatformPermission.FINANCIAL_ADVISOR_COST_MANAGE,
        scope: PlatformPermissionScope.GLOBAL,
        reason: 'QA advisor cost-rate global delegation',
      },
    );
    await expect(
      rates.submit(
        wrongScopeRate.id,
        { lockVersion: 0, reason: 'Global governed proposal' },
        financialActor(globalEmployee),
      ),
    ).resolves.toMatchObject({ status: 'PROPOSED', lockVersion: 1 });

    await service.revokeGrant(
      { userId: founder.id },
      costGrant.id,
      costGrant.lockVersion,
      'QA immediate financial revocation',
    );
    const revokedRate = await rates.createDraft(
      {
        organizationId: customer.id,
        userId: customerAdmin.id,
        currency: 'CAD',
        hourlyCost: '91',
        effectiveFrom: '2030-04-01',
      },
      financialActor(founder),
    );
    await expect(
      rates.submit(
        revokedRate.id,
        { lockVersion: 0, reason: 'Revoked grant denial' },
        financialActor(employee),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const customerOperator = await prisma.user.create({
      data: {
        email: `customer-operator-${suffix}@example.invalid`,
        password: 'synthetic-not-a-real-secret',
        firstName: 'QA',
        lastName: 'Customer Operator',
        role: 'OPERATOR',
        organizationId: customer.id,
      },
    });
    await expect(
      rates.submit(
        revokedRate.id,
        { lockVersion: 0, reason: 'Customer OPERATOR denial' },
        financialActor(customerOperator),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      rates.submit(
        revokedRate.id,
        { lockVersion: 0, reason: 'Customer ADMIN denial' },
        financialActor(customerAdmin),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      prisma.$executeRaw`
        UPDATE "AdvisorInternalCostRate"
        SET "status" = 'PROPOSED', "proposedByUserId" = ${'forged-user-id'},
            "proposedAt" = CURRENT_TIMESTAMP, "lockVersion" = 1
        WHERE "id" = ${revokedRate.id}
      `,
    ).rejects.toThrow('FINANCIAL_ACTOR_NOT_AUTHORIZED');

    const mismatchedFounder = await prisma.user.create({
      data: {
        email: `mismatched-founder-${suffix}@example.invalid`,
        password: 'synthetic-not-a-real-secret',
        firstName: 'QA',
        lastName: 'Mismatched Founder',
        role: 'SUPER_ADMIN',
        organizationId: operator.id,
      },
    });
    await expect(
      prisma.$executeRaw`
        UPDATE "AdvisorInternalCostRate"
        SET "status" = 'PROPOSED', "proposedByUserId" = ${mismatchedFounder.id},
            "proposedAt" = CURRENT_TIMESTAMP, "lockVersion" = 1
        WHERE "id" = ${revokedRate.id}
      `,
    ).rejects.toThrow('FINANCIAL_ACTOR_NOT_AUTHORIZED');

    const inactiveEmployee = await prisma.user.create({
      data: {
        email: `inactive-financial-${suffix}@example.invalid`,
        password: 'synthetic-not-a-real-secret',
        firstName: 'QA',
        lastName: 'Inactive Financial',
        role: 'ADMIN',
        organizationId: operator.id,
        isActive: false,
      },
    });
    await prisma.platformPermissionGrant.create({
      data: {
        userId: inactiveEmployee.id,
        permission: PlatformPermission.FINANCIAL_ADVISOR_COST_MANAGE,
        scope: PlatformPermissionScope.ORGANIZATION,
        targetOrganizationId: customer.id,
        grantedByUserId: founder.id,
        grantReason: 'QA inactive actor database-boundary verification',
      },
    });
    await expect(
      prisma.$executeRaw`
        UPDATE "AdvisorInternalCostRate"
        SET "status" = 'PROPOSED', "proposedByUserId" = ${inactiveEmployee.id},
            "proposedAt" = CURRENT_TIMESTAMP, "lockVersion" = 1
        WHERE "id" = ${revokedRate.id}
      `,
    ).rejects.toThrow('FINANCIAL_ACTOR_NOT_AUTHORIZED');

    await expect(
      prisma.$executeRaw`
        UPDATE "AdvisorInternalCostRate"
        SET "organizationId" = ${otherCustomer.id}, "status" = 'PROPOSED',
            "proposedByUserId" = ${founder.id}, "proposedAt" = CURRENT_TIMESTAMP,
            "lockVersion" = 1
        WHERE "id" = ${revokedRate.id}
      `,
    ).rejects.toThrow('FINANCIAL_ADVISOR_TENANT_MISMATCH');
    expect(
      await prisma.advisorInternalCostRate.findUniqueOrThrow({
        where: { id: revokedRate.id },
      }),
    ).toMatchObject({ status: 'DRAFT', lockVersion: 0 });

    const concurrentRate = await rates.createDraft(
      {
        organizationId: customer.id,
        userId: customerAdmin.id,
        currency: 'CAD',
        hourlyCost: '92',
        effectiveFrom: '2030-05-01',
      },
      financialActor(founder),
    );
    const concurrentResults = await Promise.allSettled([
      rates.submit(
        concurrentRate.id,
        { lockVersion: 0, reason: 'Concurrent proposal A' },
        financialActor(founder),
      ),
      rates.submit(
        concurrentRate.id,
        { lockVersion: 0, reason: 'Concurrent proposal B' },
        financialActor(founder),
      ),
    ]);
    expect(
      concurrentResults.filter(({ status }) => status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      concurrentResults.filter(({ status }) => status === 'rejected'),
    ).toHaveLength(1);

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
