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
import { PopulationPhoneBackfillService } from '../src/admin/population-phone-backfill.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error('TEST_DATABASE_URL jetable est obligatoire');
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const service = new PopulationPhoneBackfillService();
const prefix = 'phone01d-fixture';

async function cleanupSubscribers() {
  await prisma.populationAlertDelivery.deleteMany({
    where: { id: { startsWith: prefix } },
  });
  await prisma.populationConsentEvent.deleteMany({
    where: { id: { startsWith: prefix } },
  });
  await prisma.populationSubscriber.deleteMany({
    where: { id: { startsWith: prefix } },
  });
}

async function cleanupAll() {
  await cleanupSubscribers();
  await prisma.populationAlert.deleteMany({
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

async function createSubscriber(
  id: string,
  phone: string | null,
  options: {
    program?: 'a' | 'b';
    phoneCanonical?: string | null;
    status?: PopulationSubscriberStatus;
    smsEnabled?: boolean;
  } = {},
) {
  return prisma.populationSubscriber.create({
    data: {
      id: `${prefix}-${id}`,
      programId: `${prefix}-program-${options.program ?? 'a'}`,
      phone,
      phoneCanonical: options.phoneCanonical ?? null,
      status: options.status ?? PopulationSubscriberStatus.ACTIVE,
      preferredLanguage: PopulationPreferredLanguage.FR,
      smsEnabled: options.smsEnabled ?? phone !== null,
      emailEnabled: false,
      verifiedAt: new Date('2026-01-02T00:00:00.000Z'),
    },
  });
}

async function businessRows() {
  return prisma.populationSubscriber.findMany({
    where: { id: { startsWith: prefix } },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      programId: true,
      phone: true,
      phoneCanonical: true,
      email: true,
      status: true,
      smsEnabled: true,
      emailEnabled: true,
      preferredLanguage: true,
      verifiedAt: true,
      unsubscribedAt: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          consentEvents: true,
          smsConsentEvidence: true,
          alertDeliveries: true,
        },
      },
    },
  });
}

async function loadSafeFixture() {
  await cleanupSubscribers();
  await createSubscriber('safe-1', '(514) 555-1234');
  await createSubscriber('safe-2', '450-555-1234');
  await createSubscriber('safe-3', '+1 418 555 1234');
  await createSubscriber('without-phone', null, { smsEnabled: false });
  await createSubscriber('invalid', 'not-a-phone');
  await createSubscriber('complete-cross-program', '+15145551234', {
    program: 'b',
    phoneCanonical: '+15145551234',
  });
  await prisma.populationConsentEvent.create({
    data: {
      id: `${prefix}-consent`,
      programId: `${prefix}-program-a`,
      subscriberId: `${prefix}-safe-1`,
      type: PopulationConsentEventType.SUBSCRIBED,
      consentVersion: 'fixture-v1',
      smsEnabled: true,
      emailEnabled: false,
    },
  });
  await prisma.populationAlertDelivery.create({
    data: {
      id: `${prefix}-delivery`,
      idempotencyKey: `${prefix}-delivery`,
      alertId: `${prefix}-alert`,
      subscriberId: `${prefix}-safe-1`,
      channel: PopulationAlertChannel.SMS,
      status: PopulationDeliveryStatus.DELIVERED,
      language: PopulationPreferredLanguage.FR,
      messageSnapshot: 'Fixture',
    },
  });
}

describe('PHONE-01D controlled Population phone backfill', () => {
  beforeAll(async () => {
    await cleanupAll();
    await prisma.organization.create({
      data: { id: `${prefix}-org`, name: 'PHONE-01D' },
    });
    await prisma.client.create({
      data: {
        id: `${prefix}-client`,
        name: 'PHONE-01D',
        organizationId: `${prefix}-org`,
        regulatoryRequirements: [],
      },
    });
    for (const suffix of ['a', 'b']) {
      await prisma.building.create({
        data: {
          id: `${prefix}-building-${suffix}`,
          name: `PHONE-01D ${suffix}`,
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
          nameFR: `PHONE-01D ${suffix}`,
          status: PopulationProgramStatus.ACTIVE,
        },
      });
    }
    await prisma.populationAlert.create({
      data: {
        id: `${prefix}-alert`,
        programId: `${prefix}-program-a`,
        type: PopulationAlertType.TEST,
        status: PopulationAlertStatus.ENDED,
        titleFR: 'Fixture',
        messageFR: 'Fixture',
        createdByType: CoroActorType.SYSTEM,
        createdById: 'PHONE-01D',
      },
    });
  });

  afterAll(async () => {
    await cleanupAll();
    await prisma.$disconnect();
  });

  it('dry-runs three exact safe candidates with zero mutation and no PII', async () => {
    await loadSafeFixture();
    const before = await businessRows();
    const result = await service.dryRun(prisma);
    const after = await businessRows();
    expect(result).toMatchObject({
      mode: 'DRY_RUN',
      eligibleCount: 3,
      appliedCount: 0,
    });
    expect(after).toEqual(before);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('+15145551234');
    expect(serialized).not.toContain('(514) 555-1234');
    expect(serialized).not.toContain('not-a-phone');
  });

  it('applies only canonical fields, preserves evidence, and is idempotent', async () => {
    await loadSafeFixture();
    const before = await businessRows();
    const first = await service.apply(prisma, 'PHONE-01D');
    const afterFirst = await businessRows();
    const second = await service.apply(prisma, 'PHONE-01D');
    const afterSecond = await businessRows();
    expect(first).toMatchObject({
      mode: 'APPLY',
      eligibleCount: 3,
      appliedCount: 3,
    });
    expect(first.updatedAtBehavior).toBe('CHANGED_FOR_APPLIED_ROWS');
    expect(second).toMatchObject({
      mode: 'APPLY',
      eligibleCount: 0,
      appliedCount: 0,
    });
    expect(afterSecond).toEqual(afterFirst);
    for (const beforeRow of before) {
      const afterRow = afterFirst.find((row) => row.id === beforeRow.id)!;
      const target = beforeRow.id.includes('safe-');
      expect(afterRow.phoneCanonical).toEqual(
        target
          ? expect.stringMatching(/^\+1\d{10}$/u)
          : beforeRow.phoneCanonical,
      );
      expect({ ...afterRow, phoneCanonical: null, updatedAt: null }).toEqual({
        ...beforeRow,
        phoneCanonical: null,
        updatedAt: null,
      });
    }
    expect(afterFirst.find((row) => row.id.endsWith('safe-1'))?._count).toEqual(
      {
        consentEvents: 1,
        smsConsentEvidence: 0,
        alertDeliveries: 1,
      },
    );
  });

  it('rejects missing confirmation', async () => {
    await loadSafeFixture();
    await expect(service.apply(prisma, 'wrong')).rejects.toThrow(
      'Apply requires exact PHONE-01D confirmation',
    );
  });

  it('refuses same-program collision and canonical/raw mismatch', async () => {
    await cleanupSubscribers();
    await createSubscriber('collision-1', '(514) 555-1234');
    await createSubscriber('collision-2', '+15145551234');
    await expect(service.apply(prisma, 'PHONE-01D')).rejects.toThrow(
      'PHONE-01C review findings prevent backfill apply',
    );
    await cleanupSubscribers();
    await createSubscriber('safe', '(450) 555-1234');
    await createSubscriber('mismatch', '(438) 555-1234', {
      phoneCanonical: '+14165551234',
    });
    await expect(service.apply(prisma, 'PHONE-01D')).rejects.toThrow(
      'PHONE-01C review findings prevent backfill apply',
    );
    expect(
      (await businessRows()).find((row) => row.id.endsWith('safe'))
        ?.phoneCanonical,
    ).toBeNull();
  });

  it('detects a concurrent row change before transaction without overwriting it', async () => {
    await cleanupSubscribers();
    await createSubscriber('concurrent', '(514) 555-1234');
    await expect(
      service.apply(prisma, 'PHONE-01D', {
        beforeTransaction: async () => {
          await prisma.populationSubscriber.update({
            where: { id: `${prefix}-concurrent` },
            data: { phone: '(450) 555-1234' },
          });
        },
      }),
    ).rejects.toThrow(
      'Candidate set changed concurrently; complete rollback required',
    );
    const row = await prisma.populationSubscriber.findUniqueOrThrow({
      where: { id: `${prefix}-concurrent` },
    });
    expect(row.phone).toBe('(450) 555-1234');
    expect(row.phoneCanonical).toBeNull();
  });

  it('rolls back every canonical mutation when a later compare-and-set fails', async () => {
    await cleanupSubscribers();
    await createSubscriber('rollback-1', '(514) 555-1234');
    await createSubscriber('rollback-2', '(450) 555-1234');
    await expect(
      service.apply(prisma, 'PHONE-01D', {
        afterCandidate: async (appliedCount, tx) => {
          if (appliedCount === 1) {
            await tx.populationSubscriber.update({
              where: { id: `${prefix}-rollback-2` },
              data: { phone: '(418) 555-1234' },
            });
          }
        },
      }),
    ).rejects.toThrow(
      'Concurrent subscriber change detected; complete rollback required',
    );
    const rows = await businessRows();
    expect(rows.map((row) => row.phoneCanonical)).toEqual([null, null]);
    expect(rows.find((row) => row.id.endsWith('rollback-2'))?.phone).toBe(
      '(450) 555-1234',
    );
  });
});
