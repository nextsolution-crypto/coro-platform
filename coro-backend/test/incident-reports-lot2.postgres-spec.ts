import {
  CoroActorType,
  IncidentPermission,
  PlatformPermission,
  PlatformPermissionScope,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { IncidentReportAccessService } from '../src/incident-reports/incident-report-access.service';
import {
  IncidentReportSortField,
  SortDirection,
} from '../src/incident-reports/dto/incident-report.dto';
import { IncidentReportsService } from '../src/incident-reports/incident-reports.service';
import { PrismaService } from '../src/prisma/prisma.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('INC-RP-01 Lot 2 on PostgreSQL', () => {
  const prisma = databaseUrl
    ? new PrismaService({ datasources: { db: { url: databaseUrl } } })
    : new PrismaService();
  const service = new IncidentReportsService(
    prisma,
    new IncidentReportAccessService(prisma),
  );
  const suffix = randomUUID();
  const ids = {
    org: randomUUID(),
    otherOrg: randomUUID(),
    client: randomUUID(),
    building: randomUUID(),
    user: randomUUID(),
    template: randomUUID(),
    retention: randomUUID(),
  };
  const actor = {
    userId: ids.user,
    organizationId: ids.org,
    role: 'OPERATOR',
  };

  beforeAll(async () => {
    process.env.INCIDENT_REPORTS_ENABLED = 'true';
    await prisma.$connect();
    await prisma.organization.createMany({
      data: [
        { id: ids.org, name: `RP Lot2 ${suffix}` },
        { id: ids.otherOrg, name: `RP Other ${suffix}` },
      ],
    });
    await prisma.client.create({
      data: {
        id: ids.client,
        organizationId: ids.org,
        name: `RP Client ${suffix}`,
        regulatoryRequirements: [],
      },
    });
    await prisma.building.create({
      data: {
        id: ids.building,
        organizationId: ids.org,
        clientId: ids.client,
        name: `RP Building ${suffix}`,
        address: '1 Synthetic',
        city: 'Montréal',
        province: 'QC',
      },
    });
    await prisma.user.create({
      data: {
        id: ids.user,
        organizationId: ids.org,
        email: `rp-lot2-${suffix}@example.invalid`,
        password: 'synthetic-not-a-real-secret',
        firstName: 'QA',
        lastName: 'Incident Report',
        role: 'OPERATOR',
      },
    });
    await prisma.coroActorIdentity.create({
      data: {
        organizationId: ids.org,
        actorType: CoroActorType.USER,
        actorId: ids.user,
        userId: ids.user,
      },
    });
    await prisma.platformPermissionGrant.createMany({
      data: [
        PlatformPermission.INCIDENT_REPORT_CREATE,
        PlatformPermission.INCIDENT_REPORT_READ,
        PlatformPermission.INCIDENT_REPORT_EDIT,
      ].map((permission) => ({
        userId: ids.user,
        permission,
        scope: PlatformPermissionScope.ORGANIZATION,
        targetOrganizationId: ids.org,
        grantedByUserId: ids.user,
        grantReason: 'Synthetic Lot 2 PostgreSQL verification',
      })),
    });
    await prisma.incidentAuthorityAssignment.create({
      data: {
        organizationId: ids.org,
        buildingId: ids.building,
        subjectType: CoroActorType.USER,
        subjectId: ids.user,
        operationalRole: 'REPORT_AUTHOR',
        permissions: [IncidentPermission.INCIDENT_READ],
        grantedByType: CoroActorType.USER,
        grantedById: ids.user,
        grantReason: 'Synthetic Lot 2 PostgreSQL verification',
      },
    });
    await prisma.incidentReportTemplateVersion.create({
      data: {
        id: ids.template,
        organizationId: ids.org,
        templateKey: `security-${suffix}`,
        version: 1,
        name: 'Synthetic security report',
        reportType: 'SECURITY',
        status: 'PUBLISHED',
        schemaVersion: '1',
        formSchema: { requiredFields: ['summary'] },
        fieldCatalog: {},
        contentHash: 'synthetic-template-hash',
        publishedAt: new Date(),
        createdByActorType: CoroActorType.USER,
        createdByActorId: ids.user,
      },
    });
    await prisma.incidentReportRetentionPolicy.create({
      data: {
        id: ids.retention,
        organizationId: ids.org,
        reportType: 'SECURITY',
        retainForDays: 365,
        createdByActorType: CoroActorType.USER,
        createdByActorId: ids.user,
      },
    });
  });

  afterAll(async () => {
    delete process.env.INCIDENT_REPORTS_ENABLED;
    await prisma.$disconnect();
  });

  it('creates idempotently, paginates, locks concurrent edits and freezes submission', async () => {
    const createKey = randomUUID();
    const input = {
      buildingId: ids.building,
      templateVersionId: ids.template,
      retentionPolicyId: ids.retention,
      reportType: 'SECURITY',
      title: 'Synthetic governed report',
      content: { summary: 'Initial observation' },
      idempotencyKey: createKey,
    };
    const [first, replay] = await Promise.all([
      service.create(ids.org, input, actor),
      service.create(ids.org, input, actor),
    ]);
    expect(replay.id).toBe(first.id);

    const page = await service.list(
      ids.org,
      {
        buildingId: ids.building,
        page: 1,
        pageSize: 1,
        sort: IncidentReportSortField.CREATED_AT,
        order: SortDirection.DESC,
      },
      actor,
    );
    expect(page.total).toBeGreaterThanOrEqual(1);
    expect(page.items).toHaveLength(1);

    const edits = await Promise.allSettled([
      service.updateDraft(
        ids.org,
        first.id,
        {
          expectedLockVersion: 0,
          content: { summary: 'Concurrent A' },
          idempotencyKey: randomUUID(),
        },
        actor,
      ),
      service.updateDraft(
        ids.org,
        first.id,
        {
          expectedLockVersion: 0,
          content: { summary: 'Concurrent B' },
          idempotencyKey: randomUUID(),
        },
        actor,
      ),
    ]);
    expect(edits.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(edits.filter(({ status }) => status === 'rejected')).toHaveLength(1);

    const current = await service.get(ids.org, first.id, actor);
    const submitted = await service.submit(
      ids.org,
      first.id,
      {
        expectedLockVersion: current.lockVersion,
        idempotencyKey: randomUUID(),
      },
      actor,
    );
    expect(submitted.status).toBe('SUBMITTED');
    const version = await prisma.incidentReportVersion.findFirstOrThrow({
      where: { reportId: first.id, versionNumber: 1 },
    });
    await expect(
      prisma.incidentReportVersion.update({
        where: { id: version.id },
        data: { content: { summary: 'tampered' } },
      }),
    ).rejects.toThrow(/immutable/i);
  });

  it('refuses an actor from another tenant without disclosing existence', async () => {
    await expect(
      service.list(
        ids.org,
        {
          buildingId: ids.building,
          page: 1,
          pageSize: 20,
          sort: IncidentReportSortField.CREATED_AT,
          order: SortDirection.DESC,
        },
        { ...actor, organizationId: ids.otherOrg },
      ),
    ).rejects.toThrow('Rapport incident introuvable');
  });

  it('keeps audit idempotency unique inside a tenant', async () => {
    const report = await prisma.incidentReport.findFirstOrThrow({
      where: { organizationId: ids.org },
    });
    const key = randomUUID();
    await prisma.incidentReportAuditEvent.create({
      data: {
        organizationId: ids.org,
        reportId: report.id,
        action: 'SYNTHETIC_IDEMPOTENCY_TEST',
        actorType: CoroActorType.USER,
        actorId: ids.user,
        idempotencyKey: key,
      },
    });
    await expect(
      prisma.incidentReportAuditEvent.create({
        data: {
          organizationId: ids.org,
          reportId: report.id,
          action: 'SYNTHETIC_IDEMPOTENCY_TEST',
          actorType: CoroActorType.USER,
          actorId: ids.user,
          idempotencyKey: key,
        },
      }),
    ).rejects.toMatchObject({
      code: 'P2002',
    } satisfies Partial<Prisma.PrismaClientKnownRequestError>);
  });
});
