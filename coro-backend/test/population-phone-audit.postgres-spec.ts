import {
  CoroActorType,
  PopulationAlertChannel,
  PopulationAlertStatus,
  PopulationAlertType,
  PopulationConsentEventType,
  PopulationDeliveryStatus,
  PopulationPreferredLanguage,
  PopulationProgramStatus,
  PopulationSubscriberStatus,
  PrismaClient,
} from '@prisma/client';
import { PopulationPhoneAuditService } from '../src/common/phone/population-phone-audit.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error('TEST_DATABASE_URL jetable est obligatoire');
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const audit = new PopulationPhoneAuditService();
const prefix = 'phone01c-fixture';

async function cleanup() {
  await prisma.populationAlertDelivery.deleteMany({
    where: { id: { startsWith: prefix } },
  });
  await prisma.populationAlert.deleteMany({
    where: { id: { startsWith: prefix } },
  });
  await prisma.populationConsentEvent.deleteMany({
    where: { id: { startsWith: prefix } },
  });
  await prisma.populationSubscriber.deleteMany({
    where: { id: { startsWith: prefix } },
  });
  await prisma.populationProgram.deleteMany({
    where: { id: { startsWith: prefix } },
  });
  await prisma.rueFacilityProfile.deleteMany({
    where: { id: { startsWith: prefix } },
  });
  await prisma.building.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.client.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.organization.deleteMany({
    where: { id: { startsWith: prefix } },
  });
}

async function auditInputs() {
  const rows = await prisma.populationSubscriber.findMany({
    where: { id: { startsWith: prefix } },
    orderBy: [{ programId: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      programId: true,
      phone: true,
      phoneCanonical: true,
      status: true,
      smsEnabled: true,
      emailEnabled: true,
      verifiedAt: true,
      createdAt: true,
      _count: {
        select: {
          consentEvents: true,
          smsConsentEvidence: true,
          alertDeliveries: true,
        },
      },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    programId: row.programId,
    phone: row.phone,
    phoneCanonical: row.phoneCanonical,
    status: row.status,
    smsEnabled: row.smsEnabled,
    emailEnabled: row.emailEnabled,
    verifiedAt: row.verifiedAt,
    createdAt: row.createdAt,
    consentEvidenceCount:
      row._count.consentEvents + row._count.smsConsentEvidence,
    historicalDeliveryCount: row._count.alertDeliveries,
  }));
}

describe('PHONE-01C Population phone audit', () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.organization.create({
      data: { id: `${prefix}-org`, name: 'PHONE-01C' },
    });
    await prisma.client.create({
      data: {
        id: `${prefix}-client`,
        name: 'PHONE-01C',
        organizationId: `${prefix}-org`,
        regulatoryRequirements: [],
      },
    });
    for (const suffix of ['a', 'b']) {
      await prisma.building.create({
        data: {
          id: `${prefix}-building-${suffix}`,
          name: `PHONE-01C ${suffix}`,
          address: 'Fixture only',
          city: 'Montreal',
          province: 'QC',
          organizationId: `${prefix}-org`,
          clientId: `${prefix}-client`,
        },
      });
      await prisma.rueFacilityProfile.create({
        data: {
          id: `${prefix}-profile-${suffix}`,
          buildingId: `${prefix}-building-${suffix}`,
        },
      });
      await prisma.populationProgram.create({
        data: {
          id: `${prefix}-program-${suffix}`,
          rueFacilityProfileId: `${prefix}-profile-${suffix}`,
          publicSlug: `${prefix}-${suffix}`,
          nameFR: `PHONE-01C ${suffix}`,
          status: PopulationProgramStatus.ACTIVE,
        },
      });
    }

    const subscribers = [
      [
        'formatted',
        '(514) 555-1234',
        null,
        PopulationSubscriberStatus.ACTIVE,
        'a',
      ],
      [
        'canonical',
        '+15145551234',
        '+15145551234',
        PopulationSubscriberStatus.ACTIVE,
        'a',
      ],
      ['invalid', 'not-a-phone', null, PopulationSubscriberStatus.ACTIVE, 'a'],
      ['empty', null, null, PopulationSubscriberStatus.ACTIVE, 'a'],
      [
        'international',
        '+33142685300',
        null,
        PopulationSubscriberStatus.ACTIVE,
        'a',
      ],
      [
        'extension',
        '5145551000 ext 4',
        null,
        PopulationSubscriberStatus.ACTIVE,
        'a',
      ],
      ['short', '911', null, PopulationSubscriberStatus.ACTIVE, 'a'],
      [
        'pending',
        '(438) 555-1000',
        null,
        PopulationSubscriberStatus.PENDING_VERIFICATION,
        'a',
      ],
      ['active', '+14385551000', null, PopulationSubscriberStatus.ACTIVE, 'a'],
      [
        'unsubscribed',
        '438-555-1000',
        null,
        PopulationSubscriberStatus.UNSUBSCRIBED,
        'a',
      ],
      ['cross', '+33142685300', null, PopulationSubscriberStatus.ACTIVE, 'b'],
      [
        'mismatch',
        '(450) 555-1000',
        '+14165551000',
        PopulationSubscriberStatus.ACTIVE,
        'a',
      ],
    ] as const;
    for (const [id, phone, phoneCanonical, status, program] of subscribers) {
      await prisma.populationSubscriber.create({
        data: {
          id: `${prefix}-${id}`,
          programId: `${prefix}-program-${program}`,
          phone,
          phoneCanonical,
          status,
          preferredLanguage: PopulationPreferredLanguage.FR,
          smsEnabled: phone !== null,
          verifiedAt:
            status === PopulationSubscriberStatus.PENDING_VERIFICATION
              ? null
              : new Date('2026-01-02T00:00:00.000Z'),
        },
      });
    }
    await prisma.populationConsentEvent.create({
      data: {
        id: `${prefix}-consent`,
        programId: `${prefix}-program-a`,
        subscriberId: `${prefix}-formatted`,
        type: PopulationConsentEventType.SUBSCRIBED,
        consentVersion: 'fixture-v1',
        smsEnabled: true,
        emailEnabled: false,
      },
    });
    await prisma.populationAlert.create({
      data: {
        id: `${prefix}-alert`,
        programId: `${prefix}-program-a`,
        type: PopulationAlertType.TEST,
        status: PopulationAlertStatus.ENDED,
        titleFR: 'Fixture',
        messageFR: 'Fixture',
        createdByType: CoroActorType.SYSTEM,
        createdById: 'PHONE-01C',
      },
    });
    await prisma.populationAlertDelivery.create({
      data: {
        id: `${prefix}-delivery`,
        idempotencyKey: `${prefix}-delivery`,
        alertId: `${prefix}-alert`,
        subscriberId: `${prefix}-canonical`,
        channel: PopulationAlertChannel.SMS,
        status: PopulationDeliveryStatus.DELIVERED,
        language: PopulationPreferredLanguage.FR,
        messageSnapshot: 'Fixture',
      },
    });
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('reports realistic aggregates, collisions and safe details deterministically', async () => {
    const input = await auditInputs();
    const first = audit.audit(input, { detailedCollisions: true });
    const second = audit.audit(input, { detailedCollisions: true });
    expect(first).toEqual(second);
    expect(first.aggregate).toMatchObject({
      TOTAL_SUBSCRIBERS: 12,
      WITH_PHONE: 11,
      WITHOUT_PHONE: 1,
      SAME_PROGRAM_COLLISION_GROUPS: 2,
      SAME_PROGRAM_COLLISION_ROWS: 5,
      CROSS_PROGRAM_REUSE_GROUPS: 1,
      CANONICAL_RAW_MISMATCH: 1,
    });
    expect(first.collisionGroups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ consentEvidenceExists: true }),
        expect.objectContaining({ multipleActiveOrPending: true }),
        expect.objectContaining({ historicalAlertDeliveriesExist: true }),
      ]),
    );
    const serialized = JSON.stringify(first);
    expect(serialized).not.toContain('+15145551234');
    expect(serialized).not.toContain('(514) 555-1234');
    expect(serialized).not.toContain('@');
  });

  it('performs zero data or schema mutations', async () => {
    const beforeRows = await auditInputs();
    const beforeColumns = await prisma.$queryRaw<Array<{ value: string }>>`
      SELECT md5(string_agg(column_name || ':' || data_type || ':' || is_nullable, ',' ORDER BY ordinal_position)) AS value
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'PopulationSubscriber'
    `;
    audit.audit(beforeRows, { detailedCollisions: true });
    const afterRows = await auditInputs();
    const afterColumns = await prisma.$queryRaw<Array<{ value: string }>>`
      SELECT md5(string_agg(column_name || ':' || data_type || ':' || is_nullable, ',' ORDER BY ordinal_position)) AS value
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'PopulationSubscriber'
    `;
    expect(afterRows).toEqual(beforeRows);
    expect(afterColumns).toEqual(beforeColumns);
  });
});
