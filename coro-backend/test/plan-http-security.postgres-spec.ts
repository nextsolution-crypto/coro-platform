import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { randomUUID } from 'crypto';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error('TEST_DATABASE_URL jetable est obligatoire');

const jwtSecret = 'plan-http-security-qa-secret-2026-minimum-32-characters';
process.env.DATABASE_URL = databaseUrl;
process.env.JWT_SECRET = jwtSecret;
process.env.PLATFORM_MFA_SECRET =
  'plan-http-security-mfa-secret-2026-minimum-32-characters';

// AppModule imports the ESM-only PDF browser dependency. The security matrix
// asserts that denied export requests never reach it.
jest.mock('puppeteer', () => ({
  __esModule: true,
  default: { launch: jest.fn() },
}));

describe('Plan authenticated HTTP security boundaries', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  const suffix = randomUUID();
  const ids = {
    orgA: `http-plan-org-a-${suffix}`,
    orgB: `http-plan-org-b-${suffix}`,
    operatorA: `http-plan-operator-a-${suffix}`,
    operatorC: `http-plan-operator-c-${suffix}`,
    operatorB: `http-plan-operator-b-${suffix}`,
    adminA: `http-plan-admin-a-${suffix}`,
    adminSubmitter: `http-plan-admin-submitter-${suffix}`,
    superAdmin: `http-plan-super-admin-${suffix}`,
    clientA: `http-plan-client-a-${suffix}`,
    clientB: `http-plan-client-b-${suffix}`,
    buildingA: `http-plan-building-a-${suffix}`,
    buildingB: `http-plan-building-b-${suffix}`,
    pmu: `http-plan-pmu-${suffix}`,
    psi: `http-plan-psi-${suffix}`,
    pca: `http-plan-pca-${suffix}`,
    foreign: `http-plan-foreign-${suffix}`,
    selfApproval: `http-plan-self-${suffix}`,
    version: `http-plan-version-${suffix}`,
  };
  let app: INestApplication | undefined;
  let http: ReturnType<typeof request>;

  const token = (
    userId: string,
    email: string,
    role: string,
    organizationId: string,
  ) =>
    new JwtService({ secret: jwtSecret }).sign({
      sub: userId,
      email,
      role,
      organizationId,
      authVersion: 1,
    });
  const auth = (value: string) => ({ Authorization: `Bearer ${value}` });
  const tokens = {
    operatorA: '',
    operatorC: '',
    operatorB: '',
    adminA: '',
    adminSubmitter: '',
    superAdmin: '',
  };

  async function securityState() {
    const projects = await prisma.project.findMany({
      where: {
        id: { in: [ids.pmu, ids.psi, ids.pca, ids.foreign, ids.selfApproval] },
      },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        status: true,
        submittedById: true,
        approvedById: true,
        configData: true,
      },
    });
    return {
      projects,
      documents: await prisma.document.count({
        where: { projectId: { in: [ids.pmu, ids.psi, ids.pca, ids.foreign] } },
      }),
      versions: await prisma.projectVersion.count({
        where: { projectId: { in: [ids.pmu, ids.psi, ids.pca, ids.foreign] } },
      }),
      audits: await prisma.auditLog.count({
        where: { projectId: { in: [ids.pmu, ids.psi, ids.pca, ids.foreign] } },
      }),
    };
  }

  beforeAll(async () => {
    // require is intentionally delayed until the isolated QA secrets above exist.
    /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */
    const { AppModule } = require('../src/app.module');
    const { EmailService } = require('../src/client-portal/email.service');
    const { ExportService } = require('../src/export/export.service');
    const { StorageService } = require('../src/storage/storage.service');
    /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailService)
      .useValue({ send: jest.fn().mockResolvedValue(undefined) })
      .overrideProvider(ExportService)
      .useValue({
        generatePdf: jest.fn().mockResolvedValue({ fr: null, en: null }),
      })
      .overrideProvider(StorageService)
      .useValue({ uploadFile: jest.fn(), getFile: jest.fn() })
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    // Nest exposes the platform HTTP server as `any`; Supertest owns the runtime shape check.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    http = request(app.getHttpServer());
    await prisma.$connect();

    await prisma.organization.createMany({
      data: [
        { id: ids.orgA, name: 'HTTP Plan Organization A' },
        { id: ids.orgB, name: 'HTTP Plan Organization B' },
      ],
    });
    const users = [
      [ids.operatorA, 'operator-a', 'OPERATOR', ids.orgA],
      [ids.operatorC, 'operator-c', 'OPERATOR', ids.orgA],
      [ids.operatorB, 'operator-b', 'OPERATOR', ids.orgB],
      [ids.adminA, 'admin-a', 'ADMIN', ids.orgA],
      [ids.adminSubmitter, 'admin-submitter', 'ADMIN', ids.orgA],
      [ids.superAdmin, 'super-admin', 'SUPER_ADMIN', ids.orgA],
    ] as const;
    await prisma.user.createMany({
      data: users.map(([id, local, role, organizationId]) => ({
        id,
        email: `${local}-${suffix}@example.invalid`,
        password: 'unused-http-fixture',
        firstName: local,
        lastName: 'HTTP QA',
        role,
        organizationId,
        authVersion: 1,
      })),
    });
    tokens.operatorA = token(
      ids.operatorA,
      `operator-a-${suffix}@example.invalid`,
      'OPERATOR',
      ids.orgA,
    );
    tokens.operatorC = token(
      ids.operatorC,
      `operator-c-${suffix}@example.invalid`,
      'OPERATOR',
      ids.orgA,
    );
    tokens.operatorB = token(
      ids.operatorB,
      `operator-b-${suffix}@example.invalid`,
      'OPERATOR',
      ids.orgB,
    );
    tokens.adminA = token(
      ids.adminA,
      `admin-a-${suffix}@example.invalid`,
      'ADMIN',
      ids.orgA,
    );
    tokens.adminSubmitter = token(
      ids.adminSubmitter,
      `admin-submitter-${suffix}@example.invalid`,
      'ADMIN',
      ids.orgA,
    );
    tokens.superAdmin = token(
      ids.superAdmin,
      `super-admin-${suffix}@example.invalid`,
      'SUPER_ADMIN',
      ids.orgA,
    );
    await prisma.client.createMany({
      data: [
        {
          id: ids.clientA,
          name: 'HTTP Client A',
          organizationId: ids.orgA,
          regulatoryRequirements: [],
        },
        {
          id: ids.clientB,
          name: 'HTTP Client B',
          organizationId: ids.orgB,
          regulatoryRequirements: [],
        },
      ],
    });
    await prisma.building.createMany({
      data: [
        {
          id: ids.buildingA,
          name: 'HTTP Building A',
          address: '1 QA',
          city: 'Montreal',
          province: 'QC',
          organizationId: ids.orgA,
          clientId: ids.clientA,
        },
        {
          id: ids.buildingB,
          name: 'HTTP Building B',
          address: '2 QA',
          city: 'Montreal',
          province: 'QC',
          organizationId: ids.orgB,
          clientId: ids.clientB,
        },
      ],
    });
    await prisma.project.createMany({
      data: [
        {
          id: ids.pmu,
          name: 'HTTP PMU A1',
          documentType: 'PMU',
          year: 2026,
          organizationId: ids.orgA,
          clientId: ids.clientA,
          buildingId: ids.buildingA,
          userId: ids.operatorA,
        },
        {
          id: ids.psi,
          name: 'HTTP PSI A2',
          documentType: 'PSI',
          year: 2026,
          organizationId: ids.orgA,
          clientId: ids.clientA,
          buildingId: ids.buildingA,
          userId: ids.operatorA,
        },
        {
          id: ids.pca,
          name: 'HTTP PCA A3',
          documentType: 'PCA',
          year: 2026,
          organizationId: ids.orgA,
          clientId: ids.clientA,
          buildingId: ids.buildingA,
          userId: ids.operatorA,
        },
        {
          id: ids.foreign,
          name: 'HTTP Foreign B1',
          documentType: 'PMU',
          year: 2026,
          organizationId: ids.orgB,
          clientId: ids.clientB,
          buildingId: ids.buildingB,
          userId: ids.operatorB,
        },
        {
          id: ids.selfApproval,
          name: 'HTTP Self Approval',
          documentType: 'PMU',
          year: 2026,
          status: 'REVIEW',
          submittedById: ids.adminSubmitter,
          submittedAt: new Date(),
          organizationId: ids.orgA,
          clientId: ids.clientA,
          buildingId: ids.buildingA,
          userId: ids.adminSubmitter,
        },
      ],
    });
    await prisma.document.create({
      data: {
        title: 'Synthetic PMU document',
        content: { modules: [] },
        projectId: ids.pmu,
      },
    });
    await prisma.projectVersion.create({
      data: {
        id: ids.version,
        projectId: ids.pmu,
        versionNumber: 1,
        label: 'Synthetic baseline',
        snapshot: { name: 'HTTP PMU A1' },
      },
    });
  }, 60000);

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: { organizationId: { in: [ids.orgA, ids.orgB] } },
    });
    await prisma.notification.deleteMany({
      where: {
        userId: {
          in: [
            ids.operatorA,
            ids.operatorC,
            ids.operatorB,
            ids.adminA,
            ids.adminSubmitter,
            ids.superAdmin,
          ],
        },
      },
    });
    await prisma.projectVersion.deleteMany({
      where: {
        projectId: {
          in: [ids.pmu, ids.psi, ids.pca, ids.foreign, ids.selfApproval],
        },
      },
    });
    await prisma.document.deleteMany({
      where: {
        projectId: {
          in: [ids.pmu, ids.psi, ids.pca, ids.foreign, ids.selfApproval],
        },
      },
    });
    await prisma.pcaConfig.deleteMany({ where: { projectId: ids.pca } });
    await prisma.project.deleteMany({
      where: {
        id: { in: [ids.pmu, ids.psi, ids.pca, ids.foreign, ids.selfApproval] },
      },
    });
    await prisma.building.deleteMany({
      where: { id: { in: [ids.buildingA, ids.buildingB] } },
    });
    await prisma.client.deleteMany({
      where: { id: { in: [ids.clientA, ids.clientB] } },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            ids.operatorA,
            ids.operatorC,
            ids.operatorB,
            ids.adminA,
            ids.adminSubmitter,
            ids.superAdmin,
          ],
        },
      },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [ids.orgA, ids.orgB] } },
    });
    await prisma.$disconnect();
    if (app) await app.close();
  });

  it('uses real JWT guards and allows the assigned operator to read the project', async () => {
    await http
      .get(`/api/projects/${ids.pmu}`)
      .set(auth(tokens.operatorA))
      .expect(200);
  });

  it('denies the complete unassigned and cross-tenant HTTP surface with zero mutation', async () => {
    const before = await securityState();
    const cases: Array<[string, string, string, string, unknown?]> = [
      ['get', `/api/projects/${ids.pmu}`, tokens.operatorC, '404'],
      [
        'put',
        `/api/projects/${ids.pmu}`,
        tokens.operatorC,
        '403',
        { name: 'Blocked' },
      ],
      ['delete', `/api/projects/${ids.pmu}`, tokens.operatorC, '403'],
      ['post', `/api/projects/${ids.pmu}/submit`, tokens.operatorC, '404'],
      ['get', `/api/projects/${ids.foreign}`, tokens.operatorA, '404'],
      [
        'put',
        `/api/projects/${ids.foreign}`,
        tokens.operatorA,
        '403',
        { name: 'Blocked foreign' },
      ],
      ['get', `/api/configurator/load/${ids.pmu}`, tokens.operatorC, '403'],
      [
        'post',
        `/api/configurator/save/${ids.pmu}`,
        tokens.operatorC,
        '403',
        {},
      ],
      ['get', `/api/configurator/load/${ids.psi}`, tokens.operatorC, '403'],
      [
        'post',
        `/api/configurator/save/${ids.psi}`,
        tokens.operatorC,
        '403',
        {},
      ],
      ['get', `/api/pca/configurator/${ids.pca}`, tokens.operatorC, '404'],
      ['post', `/api/pca/configurator/${ids.pca}`, tokens.operatorC, '404', {}],
      ['get', `/api/projects/${ids.pmu}/versions`, tokens.operatorC, '404'],
      [
        'post',
        `/api/projects/${ids.pmu}/versions/${ids.version}/restore`,
        tokens.operatorC,
        '404',
      ],
      [
        'delete',
        `/api/projects/${ids.pmu}/versions/${ids.version}`,
        tokens.operatorC,
        '404',
      ],
      [
        'post',
        `/api/generator/generate/${ids.pmu}`,
        tokens.operatorC,
        '404',
        {},
      ],
      ['get', `/api/generator/document/${ids.pmu}`, tokens.operatorC, '404'],
      [
        'post',
        `/api/projects/${ids.pmu}/export`,
        tokens.operatorC,
        '404',
        { language: 'fr', selectedModules: [] },
      ],
      [
        'get',
        `/api/projects/${ids.pmu}/export/official/fr`,
        tokens.operatorC,
        '404',
      ],
      [
        'post',
        `/api/approval/${ids.pmu}/request-revision`,
        tokens.operatorC,
        '403',
        { commentaire: 'Blocked' },
      ],
    ];
    for (const [method, path, bearer, status, body] of cases) {
      let call = http[method as 'get'](path).set(auth(bearer));
      if (body != null) call = call.send(body);
      await call.expect(Number(status));
    }
    expect(await securityState()).toEqual(before);
  });

  it('preserves canonical revision, submission and second-person approval over HTTP', async () => {
    await http
      .put(`/api/projects/${ids.pmu}`)
      .set(auth(tokens.operatorA))
      .send({ name: 'HTTP PMU A1 updated' })
      .expect(200);
    await http
      .post(`/api/projects/${ids.pmu}/submit`)
      .set(auth(tokens.operatorA))
      .expect(201);
    await http
      .post(`/api/approval/${ids.pmu}/request-revision`)
      .set(auth(tokens.adminA))
      .send({ commentaire: 'Synthetic correction required' })
      .expect(201);
    await http
      .post(`/api/approval/${ids.pmu}/submit`)
      .set(auth(tokens.operatorA))
      .expect(201);
    await http
      .post(`/api/approval/${ids.pmu}/approve`)
      .set(auth(tokens.adminA))
      .expect(201);
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: ids.pmu },
    });
    expect(project.status).toBe('VALIDATED');
    expect(project.approvedById).toBe(ids.adminA);
    await http
      .get(`/api/projects/${ids.pmu}/versions`)
      .set(auth(tokens.operatorA))
      .expect(200);
    await http
      .post(`/api/projects/${ids.pmu}/export`)
      .set(auth(tokens.operatorA))
      .send({ language: 'fr', selectedModules: [] })
      .expect(201);
  });

  it('blocks self approval on canonical and legacy HTTP routes', async () => {
    const before = await prisma.project.findUniqueOrThrow({
      where: { id: ids.selfApproval },
    });
    await http
      .post(`/api/approval/${ids.selfApproval}/approve`)
      .set(auth(tokens.adminSubmitter))
      .expect(403);
    await http
      .post(`/api/projects/${ids.selfApproval}/approve`)
      .set(auth(tokens.adminSubmitter))
      .send({})
      .expect(403);
    expect(
      await prisma.project.findUniqueOrThrow({
        where: { id: ids.selfApproval },
      }),
    ).toEqual(before);
  });
});
