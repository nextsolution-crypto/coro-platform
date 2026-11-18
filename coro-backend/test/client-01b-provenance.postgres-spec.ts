import { CoroActorType, PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('CLIENT-01B PostgreSQL actor integrity', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl! } },
  });
  const ids = {
    org: randomUUID(),
    otherOrg: randomUUID(),
    user: randomUUID(),
    client: randomUUID(),
    clientUser: randomUUID(),
    building: randomUUID(),
    template: randomUUID(),
    retention: randomUUID(),
  };

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.createMany({
      data: [
        { id: ids.org, name: `CLIENT-01B ${ids.org}` },
        { id: ids.otherOrg, name: `CLIENT-01B other ${ids.otherOrg}` },
      ],
    });
    await prisma.client.create({
      data: {
        id: ids.client,
        organizationId: ids.org,
        name: 'Synthetic client',
        regulatoryRequirements: [],
      },
    });
    await prisma.building.create({
      data: {
        id: ids.building,
        organizationId: ids.org,
        clientId: ids.client,
        name: 'Synthetic building',
        address: '1 Test',
        city: 'Montreal',
        province: 'QC',
      },
    });
    await prisma.user.create({
      data: {
        id: ids.user,
        organizationId: ids.org,
        email: `${ids.user}@example.invalid`,
        password: 'synthetic',
        firstName: 'Internal',
        lastName: 'Actor',
        role: 'OPERATOR',
      },
    });
    await prisma.clientUser.create({
      data: {
        id: ids.clientUser,
        organizationId: ids.org,
        clientId: ids.client,
        email: `${ids.clientUser}@example.invalid`,
        password: 'synthetic',
        firstName: 'Client',
        lastName: 'Actor',
        role: 'CLIENT_MANAGER',
      },
    });
    await prisma.coroActorIdentity.createMany({
      data: [
        {
          organizationId: ids.org,
          actorType: CoroActorType.USER,
          actorId: ids.user,
          userId: ids.user,
        },
        {
          organizationId: ids.org,
          actorType: CoroActorType.CLIENT_USER,
          actorId: ids.clientUser,
          clientUserId: ids.clientUser,
        },
      ],
    });
    await prisma.incidentReportTemplateVersion.create({
      data: {
        id: ids.template,
        organizationId: ids.org,
        templateKey: `synthetic-${ids.org}`,
        version: 1,
        name: 'Synthetic template',
        reportType: 'SECURITY',
        status: 'PUBLISHED',
        schemaVersion: '1',
        formSchema: {},
        fieldCatalog: {},
        contentHash: randomUUID(),
        createdByActorType: CoroActorType.USER,
        createdByActorId: ids.user,
      },
    });
    await prisma.incidentReportRetentionPolicy.create({
      data: {
        id: ids.retention,
        organizationId: ids.org,
        reportType: 'SECURITY',
        retainForDays: 30,
        createdByActorType: CoroActorType.USER,
        createdByActorId: ids.user,
      },
    });
  });

  afterAll(async () => {
    await prisma.organization
      .deleteMany({ where: { id: { in: [ids.org, ids.otherOrg] } } })
      .catch(() => undefined);
    await prisma.$disconnect();
  });

  it('rejects a cross-tenant or fabricated client actor at the FK boundary', async () => {
    await expect(
      prisma.coroActorIdentity.create({
        data: {
          organizationId: ids.otherOrg,
          actorType: CoroActorType.CLIENT_USER,
          actorId: ids.clientUser,
          clientUserId: ids.clientUser,
        },
      }),
    ).rejects.toBeTruthy();
  });

  it('rejects mutation of append-only audit provenance', async () => {
    const report = await prisma.incidentReport.create({
      data: {
        organizationId: ids.org,
        buildingId: ids.building,
        templateVersionId: ids.template,
        retentionPolicyId: ids.retention,
        reportNumber: `SYN-${randomUUID()}`,
        reportType: 'SECURITY',
        title: 'Synthetic provenance test',
        status: 'DRAFT',
        creationIdempotencyKey: randomUUID(),
        createdByActorType: CoroActorType.CLIENT_USER,
        createdByActorId: ids.clientUser,
      },
    });
    const audit = await prisma.incidentReportAuditEvent.create({
      data: {
        organizationId: ids.org,
        reportId: report.id,
        action: 'CLIENT01B_TEST_CREATED',
        actorType: CoroActorType.CLIENT_USER,
        actorId: ids.clientUser,
        reason: 'Synthetic immutable event',
      },
    });
    await expect(
      prisma.incidentReportAuditEvent.update({
        where: { id: audit.id },
        data: { reason: 'TAMPERED' },
      }),
    ).rejects.toBeTruthy();
  });
});
