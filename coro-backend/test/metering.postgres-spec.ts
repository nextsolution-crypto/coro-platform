import {
  CapabilityCode,
  CommercialScope,
  MeteringSourceQuality,
  Prisma,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { MeteringService } from '../src/metering/metering.service';
import { PrismaService } from '../src/prisma/prisma.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl)
  throw new Error(
    'TEST_DATABASE_URL jetable est obligatoire pour metering.postgres-spec',
  );
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgA = `meter-org-a-${suffix}`;
const orgB = `meter-org-b-${suffix}`;
const clientA = `meter-client-a-${suffix}`;
const clientB = `meter-client-b-${suffix}`;
const siteA = `meter-site-a-${suffix}`;
const siteB = `meter-site-b-${suffix}`;
const userId = `meter-user-${suffix}`;
const hash = (value: string) =>
  createHash('sha256').update(`${suffix}:${value}`).digest('hex');
const key = (value: number) => hash(`key:${value}`);

const root = (overrides: Record<string, unknown> = {}) => ({
  organizationId: orgA,
  capabilityCode: CapabilityCode.INCIDENT,
  scope: CommercialScope.ORGANIZATION,
  metricCode: 'INCIDENTS_STARTED',
  metricVersion: '1',
  policyVersion: '1',
  periodStart: new Date('2026-09-01T00:00:00Z'),
  periodEnd: new Date('2026-10-01T00:00:00Z'),
  timezone: 'UTC',
  quantity: new Prisma.Decimal(2),
  unit: 'INCIDENT',
  sourceQuality: MeteringSourceQuality.CANONICAL,
  sourceCount: 2n,
  sourceFingerprint: hash('a'),
  calculationKey: hash('b'),
  sourceSummary: {
    schemaVersion: '1',
    sourceModels: ['IncidentEvent'],
    contributingRows: '2',
    aggregation: 'COUNT',
    warningCodes: [],
  },
  createdByUserId: userId,
  createdByDisplayName: 'Meter Admin',
  ...overrides,
});

describe('Phase 3C MeteringResult PostgreSQL invariants', () => {
  const metering = new MeteringService(
    prisma as unknown as PrismaService,
    new AdminAuditService(),
  );
  beforeAll(async () => {
    await prisma.organization.createMany({
      data: [
        { id: orgA, name: orgA },
        { id: orgB, name: orgB },
      ],
    });
    await prisma.user.create({
      data: {
        id: userId,
        email: `${suffix}@meter.test`,
        password: 'x',
        firstName: 'Meter',
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
        organizationId: orgA,
      },
    });
    await prisma.client.createMany({
      data: [
        {
          id: clientA,
          name: clientA,
          organizationId: orgA,
          regulatoryRequirements: [],
        },
        {
          id: clientB,
          name: clientB,
          organizationId: orgB,
          regulatoryRequirements: [],
        },
      ],
    });
    await prisma.building.createMany({
      data: [
        {
          id: siteA,
          name: siteA,
          address: 'a',
          city: 'a',
          province: 'QC',
          organizationId: orgA,
          clientId: clientA,
        },
        {
          id: siteB,
          name: siteB,
          address: 'b',
          city: 'b',
          province: 'QC',
          organizationId: orgB,
          clientId: clientB,
        },
      ],
    });
  });

  it('uses the explicitly configured disposable PostgreSQL database', async () => {
    const [{ database }] = await prisma.$queryRaw<Array<{ database: string }>>`
      SELECT current_database() AS database
    `;
    const expectedDatabase = new URL(databaseUrl).pathname.replace(/^\//, '');
    expect(database).toBe(expectedDatabase);
    expect(database).not.toBe('coro_db');
  });
  afterAll(() => prisma.$disconnect());

  it('created zero results during the Phase 3C migration', async () => {
    const rows = await prisma.$queryRaw<
      Array<{ count: bigint }>
    >`SELECT COUNT(*)::bigint AS count FROM "MeteringResult" WHERE "createdAt" <= (SELECT finished_at FROM "_prisma_migrations" WHERE migration_name = '20261002010000_super_admin_v2_phase_3c_metering_results')`;
    expect(rows[0].count).toBe(0n);
  });

  it('accepts valid targets and rejects cross-tenant targets', async () => {
    await prisma.meteringResult.create({ data: root() });
    await prisma.meteringResult.create({
      data: root({
        id: `client-${suffix}`,
        scope: 'CLIENT',
        clientId: clientA,
        sourceFingerprint: hash('c'),
        calculationKey: hash('d'),
      }),
    });
    await prisma.meteringResult.create({
      data: root({
        id: `site-${suffix}`,
        scope: 'SITE',
        clientId: clientA,
        buildingId: siteA,
        sourceFingerprint: hash('e'),
        calculationKey: hash('f'),
      }),
    });
    await expect(
      prisma.meteringResult.create({
        data: root({
          scope: 'CLIENT',
          clientId: clientB,
          sourceFingerprint: hash('1'),
          calculationKey: hash('2'),
        }),
      }),
    ).rejects.toThrow();
    await expect(
      prisma.meteringResult.create({
        data: root({
          scope: 'SITE',
          clientId: clientA,
          buildingId: siteB,
          sourceFingerprint: hash('3'),
          calculationKey: hash('4'),
        }),
      }),
    ).rejects.toThrow();
  });

  it('rejects invalid periods, quantities, counts, hashes and scope shapes', async () => {
    await expect(
      prisma.meteringResult.create({
        data: root({
          periodEnd: new Date('2026-09-01'),
          calculationKey: hash('5'),
        }),
      }),
    ).rejects.toThrow();
    await expect(
      prisma.meteringResult.create({
        data: root({
          quantity: new Prisma.Decimal(-1),
          calculationKey: hash('6'),
        }),
      }),
    ).rejects.toThrow();
    await expect(
      prisma.meteringResult.create({
        data: root({ sourceCount: -1n, calculationKey: hash('7') }),
      }),
    ).rejects.toThrow();
    await expect(
      prisma.meteringResult.create({
        data: root({ sourceFingerprint: 'bad', calculationKey: hash('8') }),
      }),
    ).rejects.toThrow();
    await expect(
      prisma.meteringResult.create({
        data: root({ scope: 'SITE', calculationKey: hash('9') }),
      }),
    ).rejects.toThrow();
  });

  it('rejects UPDATE and DELETE directly', async () => {
    const row = await prisma.meteringResult.create({
      data: root({ sourceFingerprint: hash('1'), calculationKey: hash('a') }),
    });
    await expect(
      prisma.meteringResult.update({
        where: { id: row.id },
        data: { quantity: new Prisma.Decimal(3) },
      }),
    ).rejects.toThrow(/append-only/);
    await expect(
      prisma.meteringResult.delete({ where: { id: row.id } }),
    ).rejects.toThrow(/append-only/);
  });

  it('permits A → B → C and rejects invalid or competing supersession', async () => {
    const a = await prisma.meteringResult.create({
      data: root({ sourceFingerprint: hash('2'), calculationKey: key(100) }),
    });
    const b = await prisma.meteringResult.create({
      data: root({
        sourceFingerprint: hash('3'),
        calculationKey: key(101),
        supersedesResultId: a.id,
        correctionReason: 'late event',
      }),
    });
    await prisma.meteringResult.create({
      data: root({
        sourceFingerprint: hash('4'),
        calculationKey: key(102),
        supersedesResultId: b.id,
        correctionReason: 'source correction',
      }),
    });
    await expect(
      prisma.meteringResult.create({
        data: root({
          sourceFingerprint: hash('5'),
          calculationKey: key(103),
          supersedesResultId: a.id,
          correctionReason: 'competing',
        }),
      }),
    ).rejects.toThrow();
    await expect(
      prisma.meteringResult.create({
        data: root({
          sourceFingerprint: hash('3'),
          calculationKey: key(104),
          supersedesResultId: b.id,
          correctionReason: 'unchanged',
        }),
      }),
    ).rejects.toThrow();
    await expect(
      prisma.meteringResult.create({
        data: root({
          metricCode: 'OTHER',
          sourceFingerprint: hash('6'),
          calculationKey: key(105),
          supersedesResultId: b.id,
          correctionReason: 'wrong series',
        }),
      }),
    ).rejects.toThrow(/same series/);
  });

  it('serializes concurrent Calculate retries with one root and one audit', async () => {
    const offset = Date.now() % 86_400_000;
    const dto = {
      metricCode: 'INCIDENTS_STARTED',
      scope: CommercialScope.SITE,
      clientId: clientA,
      buildingId: siteA,
      periodStart: new Date(Date.parse('2035-01-01T00:00:00Z') + offset),
      periodEnd: new Date(Date.parse('2035-02-01T00:00:00Z') + offset),
      timezone: 'UTC',
    };
    const before = await prisma.adminAuditEvent.count({
      where: { organizationId: orgA, action: 'METERING_RESULT_CALCULATED' },
    });
    const results = await Promise.all([
      metering.calculate(orgA, dto, { userId, role: 'SUPER_ADMIN' }),
      metering.calculate(orgA, dto, { userId, role: 'SUPER_ADMIN' }),
    ]);
    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(new Set(results.map((result) => result.result.id)).size).toBe(1);
    expect(
      await prisma.meteringResult.count({
        where: {
          organizationId: orgA,
          metricCode: dto.metricCode,
          periodStart: dto.periodStart,
          periodEnd: dto.periodEnd,
        },
      }),
    ).toBe(1);
    expect(
      await prisma.adminAuditEvent.count({
        where: { organizationId: orgA, action: 'METERING_RESULT_CALCULATED' },
      }),
    ).toBe(before + 1);
  });

  it('serializes concurrent corrections with one successor and one audit', async () => {
    const offset = Date.now() % 86_400_000;
    const dto = {
      metricCode: 'INCIDENTS_STARTED',
      scope: CommercialScope.SITE,
      clientId: clientA,
      buildingId: siteA,
      periodStart: new Date(Date.parse('2036-01-01T00:00:00Z') + offset),
      periodEnd: new Date(Date.parse('2036-02-01T00:00:00Z') + offset),
      timezone: 'UTC',
    };
    const rootResult = await metering.calculate(orgA, dto, {
      userId,
      role: 'SUPER_ADMIN',
    });
    await prisma.incidentEvent.create({
      data: {
        organizationId: orgA,
        buildingId: siteA,
        type: 'OTHER',
        triggeredAt: new Date(dto.periodStart.getTime() + 1000),
        triggeredBy: 'fixture',
        occupantsSnapshot: {},
        teamSnapshot: {},
      },
    });
    const before = await prisma.adminAuditEvent.count({
      where: { organizationId: orgA, action: 'METERING_RESULT_SUPERSEDED' },
    });
    const outcomes = await Promise.allSettled([
      metering.correct(orgA, rootResult.result.id, 'source corrected', {
        userId,
        role: 'SUPER_ADMIN',
      }),
      metering.correct(orgA, rootResult.result.id, 'source corrected', {
        userId,
        role: 'SUPER_ADMIN',
      }),
    ]);
    expect(
      outcomes.filter((outcome) => outcome.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === 'rejected');
    expect(JSON.stringify(rejected)).toContain('RESULT_ALREADY_SUPERSEDED');
    expect(JSON.stringify(rejected)).not.toContain('P2002');
    expect(
      await prisma.meteringResult.count({
        where: { supersedesResultId: rootResult.result.id },
      }),
    ).toBe(1);
    expect(
      await prisma.adminAuditEvent.count({
        where: { organizationId: orgA, action: 'METERING_RESULT_SUPERSEDED' },
      }),
    ).toBe(before + 1);
  });

  it('keeps Calculate vs Correct linear without raw database errors', async () => {
    const offset = Date.now() % 86_400_000;
    const dto = {
      metricCode: 'INCIDENTS_STARTED',
      scope: CommercialScope.SITE,
      clientId: clientA,
      buildingId: siteA,
      periodStart: new Date(Date.parse('2037-01-01T00:00:00Z') + offset),
      periodEnd: new Date(Date.parse('2037-02-01T00:00:00Z') + offset),
      timezone: 'UTC',
    };
    const rootResult = await metering.calculate(orgA, dto, {
      userId,
      role: 'SUPER_ADMIN',
    });
    await prisma.incidentEvent.create({
      data: {
        organizationId: orgA,
        buildingId: siteA,
        type: 'OTHER',
        triggeredAt: new Date(dto.periodStart.getTime() + 1000),
        triggeredBy: 'fixture',
        occupantsSnapshot: {},
        teamSnapshot: {},
      },
    });
    const outcomes = await Promise.allSettled([
      metering.calculate(orgA, dto, { userId, role: 'SUPER_ADMIN' }),
      metering.correct(orgA, rootResult.result.id, 'source corrected', {
        userId,
        role: 'SUPER_ADMIN',
      }),
    ]);
    expect(JSON.stringify(outcomes)).not.toContain('P2002');
    const rows = await prisma.meteringResult.findMany({
      where: {
        organizationId: orgA,
        metricCode: dto.metricCode,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
      },
      include: { supersededBy: { select: { id: true } } },
    });
    expect(rows).toHaveLength(2);
    expect(rows.filter((row) => row.supersededBy === null)).toHaveLength(1);
    expect(rows.filter((row) => row.supersedesResultId === null)).toHaveLength(
      1,
    );
  });

  it('does not globally serialize different series', async () => {
    const offset = Date.now() % 86_400_000;
    const first = {
      metricCode: 'INCIDENTS_STARTED',
      scope: CommercialScope.SITE,
      clientId: clientA,
      buildingId: siteA,
      periodStart: new Date(Date.parse('2038-01-01T00:00:00Z') + offset),
      periodEnd: new Date(Date.parse('2038-02-01T00:00:00Z') + offset),
      timezone: 'UTC',
    };
    const second = {
      ...first,
      periodStart: new Date(Date.parse('2038-03-01T00:00:00Z') + offset),
      periodEnd: new Date(Date.parse('2038-04-01T00:00:00Z') + offset),
    };
    const results = await Promise.all([
      metering.calculate(orgA, first, { userId, role: 'SUPER_ADMIN' }),
      metering.calculate(orgA, second, { userId, role: 'SUPER_ADMIN' }),
    ]);
    expect(results.every((result) => result.created)).toBe(true);
    expect(new Set(results.map((result) => result.result.id)).size).toBe(2);
  });
});
