import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { PrismaClient, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { PlatformRolesGuard } from '../src/auth/platform-roles.guard';
import { ProposalPricingEngine } from '../src/commercial-proposals/proposal-pricing-engine';
import { CommercialSimulatorController } from '../src/commercial-simulator/commercial-simulator.controller';
import { CommercialSimulatorService } from '../src/commercial-simulator/commercial-simulator.service';
import { PrismaService } from '../src/prisma/prisma.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl)
  throw new Error(
    'TEST_DATABASE_URL jetable est obligatoire pour commercial-simulator-http.postgres-spec',
  );

const jwtSecret = 'commercial-simulator-http-test-secret-32-chars';

describe('Commercial Simulator configured Scenario HTTP PostgreSQL', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  const suffix = randomUUID();
  let app: INestApplication;
  let jwt: JwtService;
  let workspaceId = '';
  let scenarioId = '';
  let annualComponentId = '';
  let implementationComponentId = '';
  let superAdminToken = '';
  let adminToken = '';
  let operatorToken = '';

  const token = (user: { id: string; authVersion: number }) =>
    jwt.sign({ sub: user.id, authVersion: user.authVersion });
  const server = () => app.getHttpServer() as Parameters<typeof request>[0];

  const payload = (lockVersion: number, activeSites: string) => ({
    lockVersion,
    familyCodes: ['PROFESSIONAL'],
    catalogLines: [
      { priceComponentId: annualComponentId },
      { priceComponentId: implementationComponentId },
    ],
    customLines: [],
    driverValues: [{ driverCode: 'ACTIVE_SITES', value: activeSites }],
  });

  beforeAll(async () => {
    process.env.JWT_SECRET = jwtSecret;
    await prisma.$connect();

    const organization = await prisma.organization.create({
      data: { name: `Simulator HTTP ${suffix}` },
    });
    const users = await Promise.all(
      [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR].map((role) =>
        prisma.user.create({
          data: {
            email: `sim-http-${role.toLowerCase()}-${suffix}@example.invalid`,
            password: 'test-only',
            firstName: 'Simulator',
            lastName: role,
            role,
            organizationId: organization.id,
          },
        }),
      ),
    );
    const capability = await prisma.commercialCapability.findUniqueOrThrow({
      where: { code: 'COMPLIANCE_OPERATIONS' },
    });
    const book = await prisma.priceBook.create({
      data: {
        code: `SIM_HTTP_${suffix.replace(/-/g, '').slice(0, 16).toUpperCase()}`,
        name: 'Simulator HTTP disposable catalog',
        audience: 'DIRECT',
        currency: 'CAD',
      },
    });
    const version = await prisma.priceBookVersion.create({
      data: {
        priceBookId: book.id,
        versionNumber: 1,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
    const [annual, implementation] = await Promise.all([
      prisma.priceComponent.create({
        data: {
          priceBookVersionId: version.id,
          capabilityId: capability.id,
          code: 'CORO_PROFESSIONAL_ANNUAL',
          nameFr: 'CORO Professional annuel',
          nameEn: 'CORO Professional annual',
          pricingModel: 'CAPACITY_BAND',
          chargeType: 'RECURRING',
          revenueCategory: 'SAAS',
          billingPeriod: 'YEAR',
          metric: 'SITE',
          displayOrder: 1,
        },
      }),
      prisma.priceComponent.create({
        data: {
          priceBookVersionId: version.id,
          capabilityId: capability.id,
          code: 'CORO_PROFESSIONAL_IMPLEMENTATION_STANDARD',
          nameFr: 'Implémentation standard',
          nameEn: 'Standard implementation',
          pricingModel: 'FLAT',
          chargeType: 'ONE_TIME',
          revenueCategory: 'IMPLEMENTATION',
          metric: 'FIXED',
          amountMinor: 250_000n,
          displayOrder: 2,
        },
      }),
    ]);
    annualComponentId = annual.id;
    implementationComponentId = implementation.id;
    const workspace = await prisma.commercialSimulationWorkspace.create({
      data: {
        reference: `SIM-HTTP-${suffix}`,
        title: 'Simulator HTTP disposable workspace',
        organizationId: organization.id,
        priceBookVersionId: version.id,
        currency: 'CAD',
        createdByUserId: users[0].id,
      },
    });
    workspaceId = workspace.id;
    const scenario = await prisma.commercialSimulationScenario.create({
      data: { workspaceId, name: 'HTTP serialization' },
    });
    scenarioId = scenario.id;

    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: jwtSecret }),
      ],
      controllers: [CommercialSimulatorController],
      providers: [
        Reflector,
        PlatformRolesGuard,
        JwtStrategy,
        AdminAuditService,
        ProposalPricingEngine,
        CommercialSimulatorService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
    jwt = moduleRef.get(JwtService);
    [superAdminToken, adminToken, operatorToken] = users.map(token);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('persists once and returns exact JSON-safe configured Scenario values', async () => {
    const url = `/api/admin/v1/commercial/simulator/configurator/workspaces/${workspaceId}/scenarios/${scenarioId}`;
    const beforeAudit = await prisma.adminAuditEvent.count({
      where: { targetId: scenarioId },
    });

    const first = await request(server())
      .put(url)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send(payload(0, '125'))
      .expect(200);
    const firstBody = first.body as {
      id: string;
      lockVersion: number;
      driverValues: Array<{
        driverCode: string;
        integerValue: string | null;
        moneyMinorValue: string | null;
      }>;
      lines: Array<{ proposedUnitAmountMinor: string | null }>;
    };
    expect(firstBody.id).toBe(scenarioId);
    expect(firstBody.lockVersion).toBe(1);
    expect(firstBody.driverValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          driverCode: 'ACTIVE_SITES',
          integerValue: '125',
          moneyMinorValue: null,
        }),
      ]),
    );
    expect(firstBody.lines).toHaveLength(2);
    expect(
      firstBody.lines.every(
        (line: { proposedUnitAmountMinor: string | null }) =>
          line.proposedUnitAmountMinor === null ||
          typeof line.proposedUnitAmountMinor === 'string',
      ),
    ).toBe(true);
    expect(() => JSON.stringify(firstBody)).not.toThrow();

    const persisted =
      await prisma.commercialSimulationScenario.findUniqueOrThrow({
        where: { id: scenarioId },
        include: { driverValues: true, lines: true },
      });
    expect(persisted.lockVersion).toBe(1);
    expect(persisted.driverValues[0].integerValue).toBe(125n);
    expect(persisted.lines).toHaveLength(2);
    expect(
      await prisma.adminAuditEvent.count({ where: { targetId: scenarioId } }),
    ).toBe(beforeAudit + 1);

    await request(server())
      .put(url)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send(payload(0, '125'))
      .expect(409);
    expect(
      await prisma.commercialSimulationDriverValue.count({
        where: { scenarioId },
      }),
    ).toBe(1);
    expect(
      await prisma.commercialSimulationScenarioLine.count({
        where: { scenarioId },
      }),
    ).toBe(2);

    const exact = await request(server())
      .put(
        `/api/admin/v1/commercial/simulator/workspaces/${workspaceId}/scenarios/${scenarioId}`,
      )
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        lockVersion: 1,
        driverValues: [
          {
            driverCode: 'ACTIVE_SITES',
            driverVersion: 'v1',
            valueType: 'INTEGER',
            source: 'USER_INPUT',
            integerValue: '9007199254740993',
          },
        ],
      })
      .expect(200);
    const exactBody = exact.body as {
      driverValues: Array<{ integerValue: string | null }>;
    };
    expect(exactBody.driverValues[0].integerValue).toBe('9007199254740993');

    const guided = await request(server())
      .get(
        `/api/admin/v1/commercial/simulator/configurator/workspaces/${workspaceId}`,
      )
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    const guidedBody = guided.body as {
      scenarios: Array<{
        drivers: Array<{ code: string; value: string }>;
      }>;
    };
    expect(guidedBody.scenarios[0].drivers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'ACTIVE_SITES',
          value: '9007199254740993',
        }),
      ]),
    );
  });

  it('preserves SUPER_ADMIN authorization without unauthorized mutations', async () => {
    const url = `/api/admin/v1/commercial/simulator/configurator/workspaces/${workspaceId}/scenarios/${scenarioId}`;
    const before = await prisma.commercialSimulationScenario.findUniqueOrThrow({
      where: { id: scenarioId },
    });
    await request(server())
      .put(url)
      .send(payload(before.lockVersion, '125'))
      .expect(401);
    await request(server())
      .put(url)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload(before.lockVersion, '125'))
      .expect(403);
    await request(server())
      .put(url)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send(payload(before.lockVersion, '125'))
      .expect(403);
    expect(
      (
        await prisma.commercialSimulationScenario.findUniqueOrThrow({
          where: { id: scenarioId },
        })
      ).lockVersion,
    ).toBe(before.lockVersion);
  });

  it('allows exactly one concurrent update and creates no duplicate children', async () => {
    const url = `/api/admin/v1/commercial/simulator/configurator/workspaces/${workspaceId}/scenarios/${scenarioId}`;
    const current = await prisma.commercialSimulationScenario.findUniqueOrThrow(
      {
        where: { id: scenarioId },
      },
    );
    const responses = await Promise.all(
      ['126', '127'].map((value) =>
        request(server())
          .put(url)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send(payload(current.lockVersion, value)),
      ),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    expect(
      await prisma.commercialSimulationScenario.count({
        where: { id: scenarioId },
      }),
    ).toBe(1);
    expect(
      await prisma.commercialSimulationDriverValue.count({
        where: { scenarioId },
      }),
    ).toBe(1);
    expect(
      await prisma.commercialSimulationScenarioLine.count({
        where: { scenarioId },
      }),
    ).toBe(2);
  });
});
