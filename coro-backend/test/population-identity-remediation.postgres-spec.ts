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
  PopulationVerificationChannel,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { PopulationIdentityAuditService } from '../src/population/population-identity-audit.service';
import { PopulationIdentityRemediationService } from '../src/population/population-identity-remediation.service';
import { populationIdentityLockKey } from '../src/population/population-identity-lock';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (process.env.CI && !databaseUrl) {
  throw new Error('TEST_DATABASE_URL is required in CI');
}
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Population identity remediation PostgreSQL', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl! } },
  });
  const service = new PopulationIdentityRemediationService(
    prisma as unknown as PrismaService,
    new AdminAuditService(),
  );
  const prefix = `identity01b-${randomUUID()}`;
  const ids = {
    organization: `${prefix}-org`,
    client: `${prefix}-client`,
    actor: `${prefix}-actor`,
    buildingA: `${prefix}-building-a`,
    buildingB: `${prefix}-building-b`,
    profileA: `${prefix}-profile-a`,
    profileB: `${prefix}-profile-b`,
    programA: `${prefix}-program-a`,
    programB: `${prefix}-program-b`,
  };

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.create({
      data: { id: ids.organization, name: 'Identity 01B' },
    });
    await prisma.client.create({
      data: {
        id: ids.client,
        name: 'Identity 01B',
        organizationId: ids.organization,
        regulatoryRequirements: [],
      },
    });
    await prisma.user.create({
      data: {
        id: ids.actor,
        email: `${prefix}@example.invalid`,
        password: 'not-used',
        firstName: 'Identity',
        lastName: 'Operator',
        role: UserRole.SUPER_ADMIN,
        organizationId: ids.organization,
      },
    });
    for (const variant of ['A', 'B'] as const) {
      const lower = variant.toLowerCase() as 'a' | 'b';
      await prisma.building.create({
        data: {
          id: ids[`building${variant}`],
          name: `Identity ${variant}`,
          address: 'Disposable fixture',
          city: 'Montreal',
          province: 'QC',
          organizationId: ids.organization,
          clientId: ids.client,
        },
      });
      await prisma.rueFacilityProfile.create({
        data: {
          id: ids[`profile${variant}`],
          buildingId: ids[`building${variant}`],
        },
      });
      await prisma.populationProgram.create({
        data: {
          id: ids[`program${variant}`],
          rueFacilityProfileId: ids[`profile${variant}`],
          publicSlug: `${prefix}-${lower}`,
          nameFR: `Identity ${variant}`,
          status: PopulationProgramStatus.ACTIVE,
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createPair(
    label: string,
    options: { type?: 'EMAIL' | 'PHONE'; programId?: string } = {},
  ) {
    const type = options.type ?? 'EMAIL';
    const programId = options.programId ?? ids.programA;
    const authorityId = `${prefix}-${label}-authority`;
    const duplicateId = `${prefix}-${label}-duplicate`;
    const canonical =
      type === 'EMAIL'
        ? `${prefix}-${label}@example.invalid`.toLowerCase()
        : `+1514555${Math.floor(Math.random() * 9000 + 1000)}`;
    await prisma.populationSubscriber.createMany({
      data: [
        {
          id: authorityId,
          programId,
          status: PopulationSubscriberStatus.ACTIVE,
          email: type === 'EMAIL' ? canonical.toUpperCase() : null,
          phone: type === 'PHONE' ? canonical : null,
          phoneCanonical: type === 'PHONE' ? canonical : null,
          emailEnabled: type === 'EMAIL',
          smsEnabled: type === 'PHONE',
          latitude: 45.5,
          longitude: -73.5,
          locationSource: 'GEOCODED_ADDRESS',
          locationResolvedAt: new Date('2026-10-01T12:00:00Z'),
          verifiedAt: new Date('2026-10-01T11:00:00Z'),
        },
        {
          id: duplicateId,
          programId,
          status: PopulationSubscriberStatus.ACTIVE,
          email: type === 'EMAIL' ? ` ${canonical} ` : null,
          phone: type === 'PHONE' ? canonical : null,
          phoneCanonical: type === 'PHONE' ? canonical : null,
          emailEnabled: type === 'EMAIL',
          smsEnabled: type === 'PHONE',
          latitude: 46.5,
          longitude: -72.5,
          locationSource: 'GEOCODED_ADDRESS',
          locationResolvedAt: new Date('2026-10-02T12:00:00Z'),
          verifiedAt: new Date('2026-10-02T11:00:00Z'),
        },
      ],
    });
    return { type, programId, authorityId, duplicateId, canonical };
  }

  const confirmedInput = (pair: Awaited<ReturnType<typeof createPair>>) => ({
    programId: pair.programId,
    identityType: pair.type,
    authoritySubscriberId: pair.authorityId,
    abandonSubscriberId: pair.duplicateId,
    dryRun: false,
    confirmRemediation: true,
    actorUserId: ids.actor,
  });

  async function auditPair(pair: Awaited<ReturnType<typeof createPair>>) {
    const subscribers = await prisma.populationSubscriber.findMany({
      where: { id: { in: [pair.authorityId, pair.duplicateId] } },
      select: {
        programId: true,
        status: true,
        email: true,
        emailCanonical: true,
        phoneCanonical: true,
        createdAt: true,
        updatedAt: true,
        verifiedAt: true,
        _count: {
          select: {
            verifications: true,
            consentEvents: true,
            smsConsentEvidence: true,
            alertDeliveries: true,
          },
        },
      },
    });
    return new PopulationIdentityAuditService().audit(
      subscribers.map(({ _count, ...subscriber }) => ({
        ...subscriber,
        verificationCount: _count.verifications,
        consentEventCount: _count.consentEvents,
        smsEvidenceCount: _count.smsConsentEvidence,
        alertDeliveryCount: _count.alertDeliveries,
      })),
      'population-identity-01b-disposable-audit-key',
    );
  }

  it('keeps dry-run logically unchanged and emits no audit event', async () => {
    const pair = await createPair('dry-run');
    const before = await prisma.populationSubscriber.findMany({
      where: { id: { in: [pair.authorityId, pair.duplicateId] } },
      orderBy: { id: 'asc' },
    });
    const result = await service.remediate({
      ...confirmedInput(pair),
      dryRun: true,
      confirmRemediation: false,
      actorUserId: undefined,
    });
    const after = await prisma.populationSubscriber.findMany({
      where: { id: { in: [pair.authorityId, pair.duplicateId] } },
      orderBy: { id: 'asc' },
    });
    expect(result.status).toBe('DRY_RUN_OK');
    expect(after).toEqual(before);
    await expect(
      prisma.adminAuditEvent.count({ where: { targetId: pair.authorityId } }),
    ).resolves.toBe(0);
  });

  it('remediates EMAIL, preserves all historical relationships and writes one audit', async () => {
    const pair = await createPair('history');
    for (const subscriberId of [pair.authorityId, pair.duplicateId]) {
      await prisma.populationVerification.create({
        data: {
          subscriberId,
          channel: PopulationVerificationChannel.EMAIL,
          codeHash: 'hash',
          expiresAt: new Date('2026-10-05T00:00:00Z'),
          verifiedAt: new Date('2026-10-04T00:00:00Z'),
        },
      });
      await prisma.populationConsentEvent.create({
        data: {
          programId: pair.programId,
          subscriberId,
          type: PopulationConsentEventType.VERIFIED,
          consentVersion: 'v1',
          smsEnabled: false,
          emailEnabled: true,
          source: 'PUBLIC_PORTAL',
        },
      });
    }
    await prisma.populationSmsConsentEvidence.create({
      data: {
        programId: pair.programId,
        subscriberId: pair.duplicateId,
        consentVersion: 'v1',
        language: PopulationPreferredLanguage.FR,
        disclosureSnapshot: 'fixture',
        source: 'PUBLIC_PORTAL',
        surface: 'FIXTURE',
        smsEnabled: false,
        emailEnabled: true,
        submittedAt: new Date(),
      },
    });
    const alert = await prisma.populationAlert.create({
      data: {
        id: `${prefix}-history-alert`,
        programId: pair.programId,
        type: PopulationAlertType.TEST,
        status: PopulationAlertStatus.ENDED,
        titleFR: 'Fixture',
        messageFR: 'Fixture',
        createdByType: CoroActorType.SYSTEM,
        createdById: 'test',
      },
    });
    const delivery = await prisma.populationAlertDelivery.create({
      data: {
        idempotencyKey: `${prefix}-history-delivery`,
        alertId: alert.id,
        subscriberId: pair.authorityId,
        channel: PopulationAlertChannel.EMAIL,
        status: PopulationDeliveryStatus.DELIVERED,
        language: PopulationPreferredLanguage.FR,
        messageSnapshot: 'Fixture',
      },
    });
    expect(await auditPair(pair)).toHaveLength(1);
    const before = await prisma.populationSubscriber.findUniqueOrThrow({
      where: { id: pair.duplicateId },
      include: {
        verifications: true,
        consentEvents: true,
        smsConsentEvidence: true,
        alertDeliveries: true,
      },
    });
    const result = await service.remediate(confirmedInput(pair));
    const after = await prisma.populationSubscriber.findUniqueOrThrow({
      where: { id: pair.duplicateId },
      include: {
        verifications: true,
        consentEvents: true,
        smsConsentEvidence: true,
        alertDeliveries: true,
      },
    });
    expect(result.status).toBe('REMEDIATED');
    expect(after.status).toBe(PopulationSubscriberStatus.ABANDONED);
    expect(after.unsubscribedAt).toBeNull();
    expect(after.latitude).toBe(before.latitude);
    expect(after.longitude).toBe(before.longitude);
    expect(after.verifications.map(({ id }) => id)).toEqual(
      before.verifications.map(({ id }) => id),
    );
    expect(after.consentEvents.map(({ id }) => id)).toEqual(
      before.consentEvents.map(({ id }) => id),
    );
    expect(after.smsConsentEvidence.map(({ id }) => id)).toEqual(
      before.smsConsentEvidence.map(({ id }) => id),
    );
    await expect(
      prisma.populationAlertDelivery.findUnique({ where: { id: delivery.id } }),
    ).resolves.toEqual(
      expect.objectContaining({ subscriberId: pair.authorityId }),
    );
    await expect(
      prisma.adminAuditEvent.count({ where: { targetId: pair.authorityId } }),
    ).resolves.toBe(1);
    expect(await auditPair(pair)).toHaveLength(0);
  });

  it('serializes concurrent exact remediation and keeps audit evidence singular', async () => {
    const pair = await createPair('concurrent-exact');
    const results = await Promise.all([
      service.remediate(confirmedInput(pair)),
      service.remediate(confirmedInput(pair)),
    ]);
    expect(results.map(({ status }) => status).sort()).toEqual([
      'ALREADY_REMEDIATED',
      'REMEDIATED',
    ]);
    await expect(
      prisma.adminAuditEvent.count({ where: { targetId: pair.authorityId } }),
    ).resolves.toBe(1);
  });

  it('fails a concurrent reversed authority decision after lock acquisition', async () => {
    const pair = await createPair('concurrent-reversed');
    const attempts = await Promise.allSettled([
      service.remediate(confirmedInput(pair)),
      service.remediate({
        ...confirmedInput(pair),
        authoritySubscriberId: pair.duplicateId,
        abandonSubscriberId: pair.authorityId,
      }),
    ]);
    expect(
      attempts.filter(({ status }) => status === 'fulfilled'),
    ).toHaveLength(1);
    expect(attempts.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
  });

  it('serializes concurrent registration and remediation with the shared identity lock', async () => {
    const pair = await createPair('concurrent-registration');
    const lockKey = populationIdentityLockKey({
      programId: pair.programId,
      identityType: 'EMAIL',
      canonicalIdentity: pair.canonical,
    });
    let releaseRegistration!: () => void;
    const registrationMayContinue = new Promise<void>((resolve) => {
      releaseRegistration = resolve;
    });
    let registrationHasLock!: () => void;
    const registrationLocked = new Promise<void>((resolve) => {
      registrationHasLock = resolve;
    });
    const registration = prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
      registrationHasLock();
      await registrationMayContinue;
      const current = await tx.populationSubscriber.findMany({
        where: {
          programId: pair.programId,
          status: {
            in: [
              PopulationSubscriberStatus.PENDING_VERIFICATION,
              PopulationSubscriberStatus.ACTIVE,
              PopulationSubscriberStatus.SUSPENDED,
            ],
          },
        },
        select: { email: true, emailCanonical: true },
      });
      return current.filter(
        ({ email, emailCanonical }) =>
          (emailCanonical ?? email?.trim().toLowerCase()) === pair.canonical,
      ).length;
    });
    await registrationLocked;
    const remediation = service.remediate(confirmedInput(pair));
    releaseRegistration();
    await expect(registration).resolves.toBe(2);
    await expect(remediation).resolves.toMatchObject({ status: 'REMEDIATED' });
    await expect(
      prisma.populationSubscriber.count({
        where: {
          programId: pair.programId,
          status: {
            in: [
              PopulationSubscriberStatus.PENDING_VERIFICATION,
              PopulationSubscriberStatus.ACTIVE,
              PopulationSubscriberStatus.SUSPENDED,
            ],
          },
          emailCanonical: pair.canonical,
        },
      }),
    ).resolves.toBe(1);
  });

  it('rolls back subscriber and audit changes after an injected failure', async () => {
    const pair = await createPair('rollback');
    await expect(
      service.remediate({
        ...confirmedInput(pair),
        injectFailureAfterAbandon: true,
      }),
    ).rejects.toThrow('INJECTED_REMEDIATION_FAILURE');
    const rows = await prisma.populationSubscriber.findMany({
      where: { id: { in: [pair.authorityId, pair.duplicateId] } },
    });
    expect(
      rows.every(({ status }) => status === PopulationSubscriberStatus.ACTIVE),
    ).toBe(true);
    expect(
      rows.every(({ identityAuthorityAt }) => identityAuthorityAt === null),
    ).toBe(true);
    await expect(
      prisma.adminAuditEvent.count({ where: { targetId: pair.authorityId } }),
    ).resolves.toBe(0);
  });

  it('supports PHONE without modifying global suppression and allows cross-program reuse', async () => {
    const pair = await createPair('phone', { type: 'PHONE' });
    const originEvent = await prisma.populationInboundSmsEvent.create({
      data: {
        provider: 'TEST',
        providerEventKey: `${prefix}-phone-stop`,
        eventType: 'STOP',
        phoneCanonical: pair.canonical,
        providerOccurredAt: new Date(),
        payloadFingerprint: '0'.repeat(64),
      },
    });
    await prisma.populationSmsSuppression.create({
      data: {
        phoneCanonical: pair.canonical,
        provider: 'TEST',
        reason: 'PROVIDER_STOP',
        source: 'POSTGRES_FIXTURE',
        suppressedAt: new Date(),
        originEvent: { connect: { id: originEvent.id } },
      },
    });
    await prisma.populationSubscriber.create({
      data: {
        id: `${prefix}-phone-other-program`,
        programId: ids.programB,
        status: PopulationSubscriberStatus.ACTIVE,
        phone: pair.canonical,
        phoneCanonical: pair.canonical,
        identityAuthorityAt: new Date(),
      },
    });
    const beforeSuppression =
      await prisma.populationSmsSuppression.findUniqueOrThrow({
        where: { phoneCanonical: pair.canonical },
      });
    await expect(
      service.remediate(confirmedInput(pair)),
    ).resolves.toMatchObject({
      status: 'REMEDIATED',
    });
    await expect(
      prisma.populationSmsSuppression.findUniqueOrThrow({
        where: { phoneCanonical: pair.canonical },
      }),
    ).resolves.toEqual(beforeSuppression);
    await prisma.populationSmsSuppression.delete({
      where: { phoneCanonical: pair.canonical },
    });
  });

  it('allows the same canonical EMAIL in another PopulationProgram', async () => {
    const pair = await createPair('cross-program');
    await prisma.populationSubscriber.create({
      data: {
        id: `${prefix}-email-other-program`,
        programId: ids.programB,
        status: PopulationSubscriberStatus.ACTIVE,
        email: pair.canonical,
        emailCanonical: pair.canonical,
        identityAuthorityAt: new Date(),
      },
    });
    await expect(
      service.remediate(confirmedInput(pair)),
    ).resolves.toMatchObject({
      status: 'REMEDIATED',
    });
  });
});
