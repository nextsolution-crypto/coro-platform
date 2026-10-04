import {
  PopulationPreferredLanguage,
  PopulationContactChangePurpose,
  PopulationContactChangeStatus,
  PopulationContactChangeType,
  PopulationProgramStatus,
  PopulationSubscriberStatus,
  Prisma,
  PrismaClient,
  RueAssessmentStatus,
  UserRole,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { PhoneNumberService } from '../src/common/phone/phone-number.service';
import { PopulationContactCryptoService } from '../src/population/population-contact-crypto.service';
import { PopulationContactChangeService } from '../src/population/population-contact-change.service';
import { PopulationSmsSuppressionService } from '../src/population/population-sms-suppression.service';
import { PopulationService } from '../src/population/population.service';
import { PopulationIdentityRemediationService } from '../src/population/population-identity-remediation.service';
import { PopulationBrevoSmsWebhookService } from '../src/population/population-brevo-sms-webhook.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (process.env.CI && !databaseUrl)
  throw new Error('TEST_DATABASE_URL is required in CI');
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Population contact change PostgreSQL authority', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl! } },
  });
  const prefix = `profile01b-${randomUUID()}`;
  const cryptoEnvironment = {
    POPULATION_CONTACT_CHANGE_ACTIVE_KEY_ID: 'test-key',
    POPULATION_CONTACT_CHANGE_ENCRYPTION_KEYS: JSON.stringify({
      'test-key': Buffer.alloc(32, 1).toString('base64'),
    }),
    POPULATION_CONTACT_CHANGE_FINGERPRINT_KEY: Buffer.alloc(32, 2).toString(
      'base64',
    ),
    POPULATION_OTP_SECRET: 'o'.repeat(40),
    POPULATION_ACCESS_SECRET: 'a'.repeat(40),
  } as NodeJS.ProcessEnv;
  const ids = {
    organization: `${prefix}-org`,
    client: `${prefix}-client`,
    building: `${prefix}-building`,
    profile: `${prefix}-profile`,
    program: `${prefix}-program`,
    subscriber: `${prefix}-subscriber`,
    actor: `${prefix}-actor`,
  };

  const phones = new PhoneNumberService();
  const suppressions = new PopulationSmsSuppressionService(
    prisma as unknown as PrismaService,
    phones,
  );
  const readiness = {
    assertOtpReady: jest.fn(),
    assertEmailReady: jest.fn(),
    assertSmsReady: jest.fn(),
    assertVerificationChannelReady: jest.fn(),
    getReadiness: jest.fn(() => ({
      population: { contactChangeCrypto: 'READY' },
    })),
  };
  const registrationDelivery = {
    sendEmail: jest.fn(() =>
      Promise.resolve({ provider: 'TEST', providerMessageId: 'registration' }),
    ),
    sendSms: jest.fn(() =>
      Promise.resolve({ provider: 'TEST', providerMessageId: 'registration' }),
    ),
  };
  const population = new PopulationService(
    prisma as unknown as PrismaService,
    {} as never,
    registrationDelivery as never,
    {} as never,
    readiness as never,
    {} as never,
    phones,
    suppressions,
    new PopulationContactCryptoService(cryptoEnvironment),
  );
  const remediation = new PopulationIdentityRemediationService(
    prisma as unknown as PrismaService,
    new AdminAuditService(),
  );
  const webhook = new PopulationBrevoSmsWebhookService(
    prisma as unknown as PrismaService,
    suppressions,
    { POPULATION_BREVO_SMS_WEBHOOK_SECRET: 'profile-01b-secret' },
  );

  function contactAuthority(
    options: {
      onEmailCode?: (code: string) => void;
      onSmsCode?: (code: string) => void;
      prismaAuthority?: PrismaService;
    } = {},
  ) {
    return new PopulationContactChangeService(
      options.prismaAuthority ?? (prisma as unknown as PrismaService),
      { assertSubscriberAccessToken: jest.fn() } as never,
      readiness as never,
      {
        sendEmail: jest.fn(({ html }: { html: string }) => {
          options.onEmailCode?.(html.match(/\b\d{6}\b/)?.[0] ?? '');
          return Promise.resolve({
            provider: 'TEST',
            providerMessageId: 'email',
          });
        }),
        sendSms: jest.fn((_destination: string, message: string) => {
          options.onSmsCode?.(message.match(/\b\d{6}\b/)?.[0] ?? '');
          return Promise.resolve({
            provider: 'TEST',
            providerMessageId: 'sms',
          });
        }),
      } as never,
      new PopulationContactCryptoService(cryptoEnvironment),
      phones,
      suppressions,
      cryptoEnvironment,
    );
  }

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.populationSmsSuppression.deleteMany({
      where: { phoneCanonical: { startsWith: '+151455502' } },
    });
    await prisma.populationInboundSmsEvent.deleteMany({
      where: { phoneCanonical: { startsWith: '+151455502' } },
    });
    await prisma.organization.create({
      data: { id: ids.organization, name: 'Profile 01B' },
    });
    await prisma.client.create({
      data: {
        id: ids.client,
        name: 'Profile 01B',
        organizationId: ids.organization,
        regulatoryRequirements: [],
      },
    });
    await prisma.building.create({
      data: {
        id: ids.building,
        name: 'Profile 01B',
        address: 'Disposable',
        city: 'Montreal',
        province: 'QC',
        organizationId: ids.organization,
        clientId: ids.client,
      },
    });
    await prisma.rueFacilityProfile.create({
      data: {
        id: ids.profile,
        buildingId: ids.building,
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: true,
      },
    });
    await prisma.populationProgram.create({
      data: {
        id: ids.program,
        rueFacilityProfileId: ids.profile,
        publicSlug: prefix,
        nameFR: 'Profile 01B',
        status: PopulationProgramStatus.ACTIVE,
        registrationEnabled: true,
        smsEnabled: true,
        emailEnabled: true,
        consentVersion: 'v1',
        consentTextFR: 'Consent',
        privacyTextFR: 'Vie privée',
      },
    });
    await prisma.user.create({
      data: {
        id: ids.actor,
        email: `${prefix}-actor@example.invalid`,
        password: 'not-used',
        firstName: 'Profile',
        lastName: 'Actor',
        role: UserRole.SUPER_ADMIN,
        organizationId: ids.organization,
      },
    });
    await prisma.populationSubscriber.create({
      data: {
        id: ids.subscriber,
        programId: ids.program,
        status: PopulationSubscriberStatus.ACTIVE,
        email: `${prefix}@example.invalid`,
        emailCanonical: `${prefix}@example.invalid`,
        identityAuthorityAt: new Date(),
        verifiedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.populationSmsSuppression.deleteMany({
        where: { phoneCanonical: { startsWith: '+151455502' } },
      });
      await prisma.populationInboundSmsEvent.deleteMany({
        where: { phoneCanonical: { startsWith: '+151455502' } },
      });
      await prisma.populationSmsConsentEvidence.deleteMany({
        where: { programId: ids.program },
      });
      await prisma.populationConsentEvent.deleteMany({
        where: { programId: ids.program },
      });
      await prisma.populationVerification.deleteMany({
        where: { subscriber: { programId: ids.program } },
      });
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "PopulationContactChangeChallenge" DISABLE TRIGGER "PopulationContactChangeChallenge_terminal_immutable"',
      );
      await prisma.populationContactChangeChallenge.deleteMany({
        where: { programId: ids.program },
      });
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "PopulationContactChangeChallenge" ENABLE TRIGGER "PopulationContactChangeChallenge_terminal_immutable"',
      );
      await prisma.adminAuditEvent.deleteMany({
        where: { actorUserId: ids.actor },
      });
      await prisma.populationSubscriber.deleteMany({
        where: { programId: ids.program },
      });
      await prisma.user.delete({ where: { id: ids.actor } });
      await prisma.populationProgram.delete({ where: { id: ids.program } });
      await prisma.rueFacilityProfile.delete({ where: { id: ids.profile } });
      await prisma.building.delete({ where: { id: ids.building } });
      await prisma.client.delete({ where: { id: ids.client } });
      await prisma.organization.delete({ where: { id: ids.organization } });
    } finally {
      await prisma.$disconnect();
    }
  });

  const challenge = (
    id: string,
    type: PopulationContactChangeType = PopulationContactChangeType.EMAIL,
  ) => ({
    id,
    programId: ids.program,
    subscriberId: ids.subscriber,
    type,
    purpose: PopulationContactChangePurpose.CHANGE,
    status: PopulationContactChangeStatus.OTP_REQUIRED,
    proposedDestinationProtected: '{"protected":true}',
    proposedDestinationFingerprint: `${id}-fingerprint`,
    expectedCurrentDestinationFingerprint: 'current-fingerprint',
    expectedCurrentDestinationAbsent: false,
    codeHash: 'a'.repeat(64),
    expiresAt: new Date(Date.now() + 600_000),
    operationVersion: 'population-contact-change/v1',
    consentVersion: type === PopulationContactChangeType.PHONE ? 'v1' : null,
    source: 'PUBLIC_PORTAL',
    surface: 'SENTINELLE_POPULATION_PROFILE',
  });

  async function createManagedSubscriber(
    label: string,
    data: Partial<{
      email: string | null;
      emailCanonical: string | null;
      phone: string | null;
      phoneCanonical: string | null;
      smsEnabled: boolean;
      emailEnabled: boolean;
      identityAuthorityAt: Date | null;
    }> = {},
  ) {
    return prisma.populationSubscriber.create({
      data: {
        id: `${prefix}-${label}`,
        programId: ids.program,
        status: PopulationSubscriberStatus.ACTIVE,
        preferredLanguage: PopulationPreferredLanguage.FR,
        identityAuthorityAt: new Date(),
        ...data,
      },
    });
  }

  async function initiateEmail(subscriberId: string, destination: string) {
    let code = '';
    const authority = contactAuthority({
      onEmailCode: (value) => (code = value),
    });
    const initiated = await authority.initiateEmail(prefix, subscriberId, {
      accessToken: 'synthetic-access-token',
      destination,
    });
    return { authority, initiated, code };
  }

  async function initiatePhone(subscriberId: string, destination: string) {
    let code = '';
    const authority = contactAuthority({
      onSmsCode: (value) => (code = value),
    });
    const initiated = await authority.initiatePhone(prefix, subscriberId, {
      accessToken: 'synthetic-access-token',
      destination,
      smsConsent: true,
      consentVersion: 'v1',
    });
    return { authority, initiated, code };
  }

  it('applies a verified EMAIL change atomically and minimizes protected PII', async () => {
    let deliveredCode = '';
    const delivery = {
      sendEmail: jest.fn(({ html }: { html: string }) => {
        deliveredCode = html.match(/\b\d{6}\b/)?.[0] ?? '';
        return Promise.resolve({
          provider: 'BREVO',
          providerMessageId: 'synthetic-email',
        });
      }),
      sendSms: jest.fn(),
    };
    const authority = new PopulationContactChangeService(
      prisma as unknown as PrismaService,
      { assertSubscriberAccessToken: jest.fn() } as never,
      {
        assertOtpReady: jest.fn(),
        assertEmailReady: jest.fn(),
        assertSmsReady: jest.fn(),
        getReadiness: jest.fn(() => ({
          population: { contactChangeCrypto: 'READY' },
        })),
      } as never,
      delivery as never,
      new PopulationContactCryptoService(cryptoEnvironment),
      new PhoneNumberService(),
      new PopulationSmsSuppressionService(
        prisma as unknown as PrismaService,
        new PhoneNumberService(),
      ),
      cryptoEnvironment,
    );
    const destination = `${prefix}-changed@example.invalid`;
    const initiated = await authority.initiateEmail(prefix, ids.subscriber, {
      accessToken: 'synthetic-access-token',
      destination,
    });
    expect(initiated.status).toBe(PopulationContactChangeStatus.OTP_REQUIRED);
    expect(deliveredCode).toMatch(/^\d{6}$/);
    await authority.verify(
      prefix,
      ids.subscriber,
      PopulationContactChangeType.EMAIL,
      {
        accessToken: 'synthetic-access-token',
        challengeToken: initiated.challengeToken,
        code: deliveredCode,
      },
    );
    const subscriber = await prisma.populationSubscriber.findUniqueOrThrow({
      where: { id: ids.subscriber },
    });
    const applied =
      await prisma.populationContactChangeChallenge.findFirstOrThrow({
        where: {
          subscriberId: ids.subscriber,
          type: PopulationContactChangeType.EMAIL,
          status: PopulationContactChangeStatus.APPLIED,
        },
        orderBy: { appliedAt: 'desc' },
      });
    expect(subscriber.emailCanonical).toBe(destination);
    expect(applied.proposedDestinationProtected).toBeNull();
  });

  it('serializes VERIFY/VERIFY and applies one EMAIL mutation idempotently', async () => {
    let deliveredCode = '';
    const authority = new PopulationContactChangeService(
      prisma as unknown as PrismaService,
      { assertSubscriberAccessToken: jest.fn() } as never,
      {
        assertOtpReady: jest.fn(),
        assertEmailReady: jest.fn(),
        assertSmsReady: jest.fn(),
        getReadiness: jest.fn(() => ({
          population: { contactChangeCrypto: 'READY' },
        })),
      } as never,
      {
        sendEmail: jest.fn(({ html }: { html: string }) => {
          deliveredCode = html.match(/\b\d{6}\b/)?.[0] ?? '';
          return Promise.resolve({
            provider: 'BREVO',
            providerMessageId: 'synthetic-email-concurrent',
          });
        }),
        sendSms: jest.fn(),
      } as never,
      new PopulationContactCryptoService(cryptoEnvironment),
      new PhoneNumberService(),
      new PopulationSmsSuppressionService(
        prisma as unknown as PrismaService,
        new PhoneNumberService(),
      ),
      cryptoEnvironment,
    );
    const destination = `${prefix}-verify-race@example.invalid`;
    const initiated = await authority.initiateEmail(prefix, ids.subscriber, {
      accessToken: 'synthetic-access-token',
      destination,
    });
    const request = {
      accessToken: 'synthetic-access-token',
      challengeToken: initiated.challengeToken,
      code: deliveredCode,
    };
    const results = await Promise.all([
      authority.verify(
        prefix,
        ids.subscriber,
        PopulationContactChangeType.EMAIL,
        request,
      ),
      authority.verify(
        prefix,
        ids.subscriber,
        PopulationContactChangeType.EMAIL,
        request,
      ),
    ]);
    expect(results).toEqual([
      expect.objectContaining({ applied: true }),
      expect.objectContaining({ applied: true }),
    ]);
    const destinationFingerprint = new PopulationContactCryptoService(
      cryptoEnvironment,
    ).fingerprintDestination({
      type: PopulationContactChangeType.EMAIL,
      canonicalDestination: destination,
    });
    expect(
      await prisma.populationContactChangeChallenge.count({
        where: {
          subscriberId: ids.subscriber,
          proposedDestinationFingerprint: destinationFingerprint,
          status: PopulationContactChangeStatus.APPLIED,
        },
      }),
    ).toBe(1);
    expect(
      (
        await prisma.populationSubscriber.findUniqueOrThrow({
          where: { id: ids.subscriber },
        })
      ).emailCanonical,
    ).toBe(destination);
  });

  it.each([
    [
      PopulationContactChangeType.EMAIL,
      `${prefix}-race-a@example.invalid`,
      `${prefix}-race-b@example.invalid`,
    ],
    [PopulationContactChangeType.PHONE, '+15145550201', '+15145550202'],
  ])(
    'serializes concurrent %s CHANGE/CHANGE initiation',
    async (type, first, second) => {
      const subscriber = await createManagedSubscriber(
        `change-${type.toLowerCase()}`,
        {
          email:
            type === PopulationContactChangeType.EMAIL
              ? `${prefix}-old-${type}@example.invalid`
              : null,
          emailCanonical:
            type === PopulationContactChangeType.EMAIL
              ? `${prefix}-old-${type}@example.invalid`.toLowerCase()
              : null,
          phone:
            type === PopulationContactChangeType.PHONE ? '+15145550200' : null,
          phoneCanonical:
            type === PopulationContactChangeType.PHONE ? '+15145550200' : null,
        },
      );
      const authority = contactAuthority();
      const starts =
        type === PopulationContactChangeType.EMAIL
          ? [first, second].map((destination) =>
              authority.initiateEmail(prefix, subscriber.id, {
                accessToken: 'synthetic-access-token',
                destination,
              }),
            )
          : [first, second].map((destination) =>
              authority.initiatePhone(prefix, subscriber.id, {
                accessToken: 'synthetic-access-token',
                destination,
                smsConsent: true,
                consentVersion: 'v1',
              }),
            );
      const outcomes = await Promise.allSettled(starts);
      expect(
        outcomes.filter(({ status }) => status === 'fulfilled'),
      ).toHaveLength(2);
      const rows = await prisma.populationContactChangeChallenge.findMany({
        where: { subscriberId: subscriber.id, type },
      });
      expect(
        rows.filter(
          ({ status }) => status === PopulationContactChangeStatus.OTP_REQUIRED,
        ),
      ).toHaveLength(1);
      const superseded = rows.filter(
        ({ status }) => status === PopulationContactChangeStatus.SUPERSEDED,
      );
      expect(superseded).toHaveLength(1);
      expect(superseded[0].proposedDestinationProtected).toBeNull();
      const unchanged = await prisma.populationSubscriber.findUniqueOrThrow({
        where: { id: subscriber.id },
      });
      expect(
        type === PopulationContactChangeType.EMAIL
          ? unchanged.emailCanonical
          : unchanged.phoneCanonical,
      ).toBe(
        type === PopulationContactChangeType.EMAIL
          ? `${prefix}-old-${type}@example.invalid`.toLowerCase()
          : '+15145550200',
      );
      const tokens = outcomes.flatMap((outcome) =>
        outcome.status === 'fulfilled' ? [outcome.value.challengeToken] : [],
      );
      const attempts = await Promise.allSettled(
        tokens.map((challengeToken) =>
          authority.verify(prefix, subscriber.id, type, {
            accessToken: 'synthetic-access-token',
            challengeToken,
            code: '000000',
          }),
        ),
      );
      expect(
        attempts.some(
          (outcome) =>
            outcome.status === 'rejected' &&
            (outcome.reason as { code?: string }).code ===
              'CONTACT_CHANGE_SUPERSEDED',
        ),
      ).toBe(true);
    },
  );

  it.each([
    [
      PopulationContactChangeType.EMAIL,
      `${prefix}-registration-race@example.invalid`,
    ],
    [PopulationContactChangeType.PHONE, '+15145550211'],
  ])(
    'preserves one same-program identity in concurrent registration/%s change',
    async (type, destination) => {
      const subscriber = await createManagedSubscriber(
        `registration-change-${type.toLowerCase()}`,
        {
          email:
            type === PopulationContactChangeType.EMAIL
              ? `${prefix}-registration-old@example.invalid`
              : null,
          emailCanonical:
            type === PopulationContactChangeType.EMAIL
              ? `${prefix}-registration-old@example.invalid`
              : null,
          phone:
            type === PopulationContactChangeType.PHONE ? '+15145550210' : null,
          phoneCanonical:
            type === PopulationContactChangeType.PHONE ? '+15145550210' : null,
        },
      );
      const initiated =
        type === PopulationContactChangeType.EMAIL
          ? await initiateEmail(subscriber.id, destination)
          : await initiatePhone(subscriber.id, destination);
      const registrationDto =
        type === PopulationContactChangeType.EMAIL
          ? {
              email: destination,
              preferredLanguage: PopulationPreferredLanguage.FR,
              consentVersion: 'v1',
            }
          : {
              phone: destination,
              preferredLanguage: PopulationPreferredLanguage.FR,
              consentVersion: 'v1',
              smsConsent: true,
            };
      const outcomes = await Promise.allSettled([
        population.registerSubscriber(prefix, registrationDto),
        initiated.authority.verify(prefix, subscriber.id, type, {
          accessToken: 'synthetic-access-token',
          challengeToken: initiated.initiated.challengeToken,
          code: initiated.code,
        }),
      ]);
      expect(outcomes.some(({ status }) => status === 'fulfilled')).toBe(true);
      const owners = await prisma.populationSubscriber.count({
        where: {
          programId: ids.program,
          status: {
            in: [
              PopulationSubscriberStatus.PENDING_VERIFICATION,
              PopulationSubscriberStatus.ACTIVE,
              PopulationSubscriberStatus.SUSPENDED,
            ],
          },
          identityAuthorityAt: { not: null },
          ...(type === PopulationContactChangeType.EMAIL
            ? { emailCanonical: destination }
            : { phoneCanonical: destination }),
        },
      });
      expect(owners).toBe(1);
    },
  );

  it('serializes remediation against stale EMAIL apply', async () => {
    const canonical = `${prefix}-remediation-old@example.invalid`;
    const target = await createManagedSubscriber('remediation-target', {
      email: canonical,
      emailCanonical: canonical,
    });
    const authoritySubscriber = await createManagedSubscriber(
      'remediation-authority',
      {
        email: canonical,
        emailCanonical: canonical,
        identityAuthorityAt: null,
      },
    );
    const next = `${prefix}-remediation-new@example.invalid`;
    const initiated = await initiateEmail(target.id, next);
    const outcomes = await Promise.allSettled([
      remediation.remediate({
        programId: ids.program,
        identityType: 'EMAIL',
        authoritySubscriberId: authoritySubscriber.id,
        abandonSubscriberId: target.id,
        dryRun: false,
        confirmRemediation: true,
        actorUserId: ids.actor,
      }),
      initiated.authority.verify(
        prefix,
        target.id,
        PopulationContactChangeType.EMAIL,
        {
          accessToken: 'synthetic-access-token',
          challengeToken: initiated.initiated.challengeToken,
          code: initiated.code,
        },
      ),
    ]);
    expect(outcomes.some(({ status }) => status === 'fulfilled')).toBe(true);
    const final = await prisma.populationSubscriber.findUniqueOrThrow({
      where: { id: target.id },
    });
    const challengeRow =
      await prisma.populationContactChangeChallenge.findFirstOrThrow({
        where: {
          subscriberId: target.id,
          proposedDestinationFingerprint: new PopulationContactCryptoService(
            cryptoEnvironment,
          ).fingerprintDestination({
            type: PopulationContactChangeType.EMAIL,
            canonicalDestination: next,
          }),
        },
      });
    if (final.status === PopulationSubscriberStatus.ABANDONED) {
      expect(final.emailCanonical).toBe(canonical);
      expect(challengeRow.status).not.toBe(
        PopulationContactChangeStatus.APPLIED,
      );
    } else {
      expect(final.emailCanonical).toBe(next);
      expect(challengeRow.status).toBe(PopulationContactChangeStatus.APPLIED);
    }
  });

  it('serializes unsubscribe against EMAIL apply without lifecycle reactivation', async () => {
    const oldEmail = `${prefix}-unsubscribe-old@example.invalid`;
    const nextEmail = `${prefix}-unsubscribe-new@example.invalid`;
    const subscriber = await createManagedSubscriber('unsubscribe-change', {
      email: oldEmail,
      emailCanonical: oldEmail,
    });
    const initiated = await initiateEmail(subscriber.id, nextEmail);
    jest
      .spyOn(population as never, 'verifySubscriberAccessToken' as never)
      .mockReturnValueOnce({} as never);
    await Promise.allSettled([
      population.unsubscribeSubscriber(prefix, subscriber.id, {
        accessToken: 'synthetic-access-token',
      }),
      initiated.authority.verify(
        prefix,
        subscriber.id,
        PopulationContactChangeType.EMAIL,
        {
          accessToken: 'synthetic-access-token',
          challengeToken: initiated.initiated.challengeToken,
          code: initiated.code,
        },
      ),
    ]);
    const final = await prisma.populationSubscriber.findUniqueOrThrow({
      where: { id: subscriber.id },
    });
    const contact =
      await prisma.populationContactChangeChallenge.findFirstOrThrow({
        where: { subscriberId: subscriber.id },
      });
    expect(final.status).toBe(PopulationSubscriberStatus.UNSUBSCRIBED);
    expect(final.identityAuthorityAt).not.toBeNull();
    if (contact.status === PopulationContactChangeStatus.APPLIED)
      expect(final.emailCanonical).toBe(nextEmail);
    else expect(final.emailCanonical).toBe(oldEmail);
  });

  it('preserves STOP suppression across concurrent PHONE apply', async () => {
    const subscriber = await createManagedSubscriber('stop-change', {
      phone: '+15145550220',
      phoneCanonical: '+15145550220',
      smsEnabled: true,
    });
    const destination = '+15145550221';
    const initiated = await initiatePhone(subscriber.id, destination);
    await Promise.allSettled([
      webhook.receive('Bearer profile-01b-secret', {
        event: 'replied',
        to: destination,
        reply: 'STOP',
        messageId: `${prefix}-stop-message`,
        ts_event: 1_800_000_000,
      }),
      initiated.authority.verify(
        prefix,
        subscriber.id,
        PopulationContactChangeType.PHONE,
        {
          accessToken: 'synthetic-access-token',
          challengeToken: initiated.initiated.challengeToken,
          code: initiated.code,
        },
      ),
    ]);
    const suppression = await prisma.populationSmsSuppression.findUnique({
      where: { phoneCanonical: destination },
    });
    const final = await prisma.populationSubscriber.findUniqueOrThrow({
      where: { id: subscriber.id },
    });
    expect(suppression).not.toBeNull();
    if (final.phoneCanonical === destination)
      expect(final.smsEnabled).toBe(false);
  });

  it.each(['APPLY_THEN_STOP', 'STOP_THEN_APPLY'] as const)(
    'preserves suppression for explicit %s serialization',
    async (order) => {
      const suffix = order.toLowerCase();
      const oldPhone =
        order === 'APPLY_THEN_STOP' ? '+15145550240' : '+15145550242';
      const destination =
        order === 'APPLY_THEN_STOP' ? '+15145550241' : '+15145550243';
      const subscriber = await createManagedSubscriber(`stop-order-${suffix}`, {
        phone: oldPhone,
        phoneCanonical: oldPhone,
        smsEnabled: true,
      });
      const initiated = await initiatePhone(subscriber.id, destination);
      const apply = () =>
        initiated.authority.verify(
          prefix,
          subscriber.id,
          PopulationContactChangeType.PHONE,
          {
            accessToken: 'synthetic-access-token',
            challengeToken: initiated.initiated.challengeToken,
            code: initiated.code,
          },
        );
      const stop = () =>
        webhook.receive('Bearer profile-01b-secret', {
          event: 'replied',
          to: destination,
          reply: 'STOP',
          messageId: `${prefix}-${suffix}`,
          ts_event: 1_800_000_001,
        });
      if (order === 'APPLY_THEN_STOP') {
        await apply();
        await stop();
      } else {
        await stop();
        await apply();
      }
      const final = await prisma.populationSubscriber.findUniqueOrThrow({
        where: { id: subscriber.id },
      });
      expect(final.phoneCanonical).toBe(destination);
      expect(final.smsEnabled).toBe(false);
      await expect(
        prisma.populationSmsSuppression.findUnique({
          where: { phoneCanonical: destination },
        }),
      ).resolves.not.toBeNull();
    },
  );

  it('serializes RESEND/VERIFY with one authoritative OTP generation', async () => {
    const subscriber = await createManagedSubscriber('resend-verify', {
      email: `${prefix}-resend-old@example.invalid`,
      emailCanonical: `${prefix}-resend-old@example.invalid`,
    });
    const initiated = await initiateEmail(
      subscriber.id,
      `${prefix}-resend-new@example.invalid`,
    );
    const outcomes = await Promise.allSettled([
      initiated.authority.resend(
        prefix,
        subscriber.id,
        PopulationContactChangeType.EMAIL,
        {
          accessToken: 'synthetic-access-token',
          challengeToken: initiated.initiated.challengeToken,
        },
      ),
      initiated.authority.verify(
        prefix,
        subscriber.id,
        PopulationContactChangeType.EMAIL,
        {
          accessToken: 'synthetic-access-token',
          challengeToken: initiated.initiated.challengeToken,
          code: initiated.code,
        },
      ),
    ]);
    expect(
      outcomes.filter(({ status }) => status === 'fulfilled'),
    ).toHaveLength(1);
    const row = await prisma.populationContactChangeChallenge.findFirstOrThrow({
      where: { subscriberId: subscriber.id },
    });
    expect([
      PopulationContactChangeStatus.APPLIED,
      PopulationContactChangeStatus.OTP_REQUIRED,
    ]).toContain(row.status);
    expect(row.deliveryGeneration).toBe(
      row.status === PopulationContactChangeStatus.APPLIED ? 1 : 2,
    );
  });

  it('serializes CANCEL/VERIFY to one terminal outcome', async () => {
    const oldEmail = `${prefix}-cancel-old@example.invalid`;
    const nextEmail = `${prefix}-cancel-new@example.invalid`;
    const subscriber = await createManagedSubscriber('cancel-verify', {
      email: oldEmail,
      emailCanonical: oldEmail,
    });
    const initiated = await initiateEmail(subscriber.id, nextEmail);
    await Promise.allSettled([
      initiated.authority.cancel(
        prefix,
        subscriber.id,
        PopulationContactChangeType.EMAIL,
        {
          accessToken: 'synthetic-access-token',
          challengeToken: initiated.initiated.challengeToken,
        },
      ),
      initiated.authority.verify(
        prefix,
        subscriber.id,
        PopulationContactChangeType.EMAIL,
        {
          accessToken: 'synthetic-access-token',
          challengeToken: initiated.initiated.challengeToken,
          code: initiated.code,
        },
      ),
    ]);
    const row = await prisma.populationContactChangeChallenge.findFirstOrThrow({
      where: { subscriberId: subscriber.id },
    });
    const final = await prisma.populationSubscriber.findUniqueOrThrow({
      where: { id: subscriber.id },
    });
    expect([
      PopulationContactChangeStatus.CANCELLED,
      PopulationContactChangeStatus.APPLIED,
    ]).toContain(row.status);
    expect(row.proposedDestinationProtected).toBeNull();
    expect(
      row.status === PopulationContactChangeStatus.APPLIED
        ? final.emailCanonical
        : oldEmail,
    ).toBe(
      row.status === PopulationContactChangeStatus.APPLIED
        ? nextEmail
        : final.emailCanonical,
    );
    expect(Boolean(row.appliedAt) && Boolean(row.cancelledAt)).toBe(false);
  });

  it('rejects expired verification and accepts a non-expired challenge', async () => {
    const subscriber = await createManagedSubscriber('expiry-verify', {
      email: `${prefix}-expiry-old@example.invalid`,
      emailCanonical: `${prefix}-expiry-old@example.invalid`,
    });
    const expired = await initiateEmail(
      subscriber.id,
      `${prefix}-expired@example.invalid`,
    );
    const expiredId = (
      await prisma.populationContactChangeChallenge.findFirstOrThrow({
        where: {
          subscriberId: subscriber.id,
          status: PopulationContactChangeStatus.OTP_REQUIRED,
        },
        select: { id: true },
      })
    ).id;
    await prisma.populationContactChangeChallenge.update({
      where: { id: expiredId },
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    await expect(
      expired.authority.verify(
        prefix,
        subscriber.id,
        PopulationContactChangeType.EMAIL,
        {
          accessToken: 'synthetic-access-token',
          challengeToken: expired.initiated.challengeToken,
          code: expired.code,
        },
      ),
    ).rejects.toMatchObject({ code: 'CONTACT_CHANGE_EXPIRED' });
    const expiredRow =
      await prisma.populationContactChangeChallenge.findUniqueOrThrow({
        where: { id: expiredId },
      });
    expect(expiredRow.status).toBe(PopulationContactChangeStatus.EXPIRED);
    expect(expiredRow.proposedDestinationProtected).toBeNull();
    const fresh = await initiateEmail(
      subscriber.id,
      `${prefix}-fresh@example.invalid`,
    );
    await expect(
      fresh.authority.verify(
        prefix,
        subscriber.id,
        PopulationContactChangeType.EMAIL,
        {
          accessToken: 'synthetic-access-token',
          challengeToken: fresh.initiated.challengeToken,
          code: fresh.code,
        },
      ),
    ).resolves.toMatchObject({ applied: true });
  });

  it.each([
    [
      PopulationContactChangeType.EMAIL,
      `${prefix}-rollback-email@example.invalid`,
    ],
    [PopulationContactChangeType.PHONE, '+15145550231'],
  ])(
    'rolls back the complete %s APPLY after subscriber mutation failure injection',
    async (type, destination) => {
      const oldEmail = `${prefix}-rollback-old@example.invalid`;
      const subscriber = await createManagedSubscriber(
        `rollback-${type.toLowerCase()}`,
        {
          email: type === PopulationContactChangeType.EMAIL ? oldEmail : null,
          emailCanonical:
            type === PopulationContactChangeType.EMAIL ? oldEmail : null,
          phone:
            type === PopulationContactChangeType.PHONE ? '+15145550230' : null,
          phoneCanonical:
            type === PopulationContactChangeType.PHONE ? '+15145550230' : null,
          smsEnabled: type === PopulationContactChangeType.PHONE,
        },
      );
      const initiated =
        type === PopulationContactChangeType.EMAIL
          ? await initiateEmail(subscriber.id, destination)
          : await initiatePhone(subscriber.id, destination);
      const transactionWithFailure = <T>(
        callback: (tx: Prisma.TransactionClient) => Promise<T>,
      ) =>
        prisma.$transaction(async (tx) => {
          const subscriberProxy = new Proxy(tx.populationSubscriber, {
            get(target, property, receiver) {
              if (property !== 'update')
                return Reflect.get(target, property, receiver) as unknown;
              return async (args: Prisma.PopulationSubscriberUpdateArgs) => {
                await tx.populationSubscriber.update(args);
                throw new Error('INJECTED_CONTACT_CHANGE_FAILURE');
              };
            },
          });
          const transactionProxy = new Proxy(tx, {
            get(target, property, receiver) {
              return property === 'populationSubscriber'
                ? subscriberProxy
                : (Reflect.get(target, property, receiver) as unknown);
            },
          });
          return callback(transactionProxy);
        });
      const injectedPrisma = new Proxy(prisma, {
        get(target, property, receiver) {
          return property === '$transaction'
            ? transactionWithFailure
            : (Reflect.get(target, property, receiver) as unknown);
        },
      }) as unknown as PrismaService;
      const failing = contactAuthority({ prismaAuthority: injectedPrisma });
      const evidenceBefore = await prisma.populationSmsConsentEvidence.count({
        where: { subscriberId: subscriber.id },
      });
      const eventsBefore = await prisma.populationConsentEvent.count({
        where: { subscriberId: subscriber.id },
      });
      await expect(
        failing.verify(prefix, subscriber.id, type, {
          accessToken: 'synthetic-access-token',
          challengeToken: initiated.initiated.challengeToken,
          code: initiated.code,
        }),
      ).rejects.toThrow('INJECTED_CONTACT_CHANGE_FAILURE');
      const final = await prisma.populationSubscriber.findUniqueOrThrow({
        where: { id: subscriber.id },
      });
      expect(
        type === PopulationContactChangeType.EMAIL
          ? final.emailCanonical
          : final.phoneCanonical,
      ).toBe(
        type === PopulationContactChangeType.EMAIL ? oldEmail : '+15145550230',
      );
      const row =
        await prisma.populationContactChangeChallenge.findFirstOrThrow({
          where: { subscriberId: subscriber.id },
        });
      expect(row.status).toBe(PopulationContactChangeStatus.OTP_REQUIRED);
      expect(row.appliedAt).toBeNull();
      expect(
        await prisma.populationSmsConsentEvidence.count({
          where: { subscriberId: subscriber.id },
        }),
      ).toBe(evidenceBefore);
      expect(
        await prisma.populationConsentEvent.count({
          where: { subscriberId: subscriber.id },
        }),
      ).toBe(eventsBefore);
    },
  );

  it('applies PHONE with fresh consent evidence without bypassing suppression', async () => {
    let deliveredCode = '';
    const delivery = {
      sendEmail: jest.fn(),
      sendSms: jest.fn((_destination: string, message: string) => {
        deliveredCode = message.match(/\b\d{6}\b/)?.[0] ?? '';
        return Promise.resolve({
          provider: 'BREVO',
          providerMessageId: 'synthetic-sms',
        });
      }),
    };
    const authority = new PopulationContactChangeService(
      prisma as unknown as PrismaService,
      { assertSubscriberAccessToken: jest.fn() } as never,
      {
        assertOtpReady: jest.fn(),
        assertEmailReady: jest.fn(),
        assertSmsReady: jest.fn(),
        getReadiness: jest.fn(() => ({
          population: { contactChangeCrypto: 'READY' },
        })),
      } as never,
      delivery as never,
      new PopulationContactCryptoService(cryptoEnvironment),
      new PhoneNumberService(),
      new PopulationSmsSuppressionService(
        prisma as unknown as PrismaService,
        new PhoneNumberService(),
      ),
      cryptoEnvironment,
    );
    const destination = '+15145550142';
    const initiated = await authority.initiatePhone(prefix, ids.subscriber, {
      accessToken: 'synthetic-access-token',
      destination,
      smsConsent: true,
      consentVersion: 'v1',
    });
    await authority.verify(
      prefix,
      ids.subscriber,
      PopulationContactChangeType.PHONE,
      {
        accessToken: 'synthetic-access-token',
        challengeToken: initiated.challengeToken,
        code: deliveredCode,
      },
    );
    const subscriber = await prisma.populationSubscriber.findUniqueOrThrow({
      where: { id: ids.subscriber },
    });
    const evidence = await prisma.populationSmsConsentEvidence.findFirstOrThrow(
      {
        where: {
          subscriberId: ids.subscriber,
          contactChangeChallengeId: { not: null },
        },
      },
    );
    expect(subscriber.phoneCanonical).toBe(destination);
    expect(subscriber.smsEnabled).toBe(true);
    expect(evidence.consentVersion).toBe('v1');
    expect(evidence.verifiedAt).toBeInstanceOf(Date);
    expect(
      await prisma.populationSmsSuppression.count({
        where: { phoneCanonical: destination },
      }),
    ).toBe(0);
  });

  it('enforces one operational challenge per subscriber and type', async () => {
    const first = `${prefix}-unique-a`;
    const second = `${prefix}-unique-b`;
    await prisma.populationContactChangeChallenge.create({
      data: challenge(first),
    });
    await expect(
      prisma.populationContactChangeChallenge.create({
        data: challenge(second),
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await prisma.populationContactChangeChallenge.update({
      where: { id: first },
      data: {
        status: PopulationContactChangeStatus.SUPERSEDED,
        supersededAt: new Date(),
        proposedDestinationProtected: null,
      },
    });
    await expect(
      prisma.populationContactChangeChallenge.create({
        data: challenge(second),
      }),
    ).resolves.toMatchObject({ id: second });
    await prisma.populationContactChangeChallenge.update({
      where: { id: second },
      data: {
        status: PopulationContactChangeStatus.SUPERSEDED,
        supersededAt: new Date(),
        proposedDestinationProtected: null,
      },
    });
  });

  it('allows PHONE and EMAIL operational challenges to coexist', async () => {
    const phoneId = `${prefix}-phone`;
    await expect(
      prisma.populationContactChangeChallenge.create({
        data: challenge(phoneId, PopulationContactChangeType.PHONE),
      }),
    ).resolves.toMatchObject({ type: PopulationContactChangeType.PHONE });
  });

  it('requires terminal protected PII minimization', async () => {
    const id = `${prefix}-pii`;
    await prisma.populationContactChangeChallenge.create({
      data: challenge(id),
    });
    await expect(
      prisma.populationContactChangeChallenge.update({
        where: { id },
        data: { status: PopulationContactChangeStatus.CANCELLED },
      }),
    ).rejects.toBeDefined();
    await expect(
      prisma.populationContactChangeChallenge.update({
        where: { id },
        data: {
          status: PopulationContactChangeStatus.CANCELLED,
          cancelledAt: new Date(),
          proposedDestinationProtected: null,
        },
      }),
    ).resolves.toMatchObject({ proposedDestinationProtected: null });
  });

  it('makes terminal challenge history immutable in the database', async () => {
    const id = `${prefix}-terminal`;
    await prisma.populationContactChangeChallenge.create({
      data: challenge(id),
    });
    await prisma.populationContactChangeChallenge.update({
      where: { id },
      data: {
        status: PopulationContactChangeStatus.APPLIED,
        appliedAt: new Date(),
        verifiedAt: new Date(),
        proposedDestinationProtected: null,
      },
    });
    await expect(
      prisma.populationContactChangeChallenge.update({
        where: { id },
        data: { appliedAt: new Date() },
      }),
    ).rejects.toBeDefined();
    await expect(
      prisma.populationContactChangeChallenge.delete({ where: { id } }),
    ).rejects.toBeDefined();
  });
});
