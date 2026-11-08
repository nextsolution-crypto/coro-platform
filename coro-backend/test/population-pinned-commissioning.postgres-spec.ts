import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { PopulationService } from '../src/population/population.service';
import { PopulationGeospatialService } from '../src/population/population-geospatial.service';
import { PopulationDeliveryService } from '../src/population/population-delivery.service';
import { PopulationReadinessService } from '../src/population/population-readiness.service';
import { PopulationOperationalEventsService } from '../src/population/population-operational-events.service';
import { PhoneNumberService } from '../src/common/phone/phone-number.service';
import { PopulationSmsSuppressionService } from '../src/population/population-sms-suppression.service';
import { PopulationControlledLiveTestService } from '../src/population/population-controlled-live-test.service';
import { DemoCommunicationPolicyService } from '../src/demo-environment/demo-communication-policy.service';
import { setupPopulationControlledTest } from '../src/admin/population-controlled-test-setup';

// This is the same governed, stdin-compatible operation used by production.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const operation =
  require('../../ops/population/population-live-recipient-enrollment.cjs') as {
    TARGET: Record<
      | 'organizationId'
      | 'programId'
      | 'clientId'
      | 'buildingId'
      | 'publicSlug'
      | 'syntheticSubscriberId'
      | 'operatorEmail'
      | 'preparerId'
      | 'approverId',
      string
    >;
    APPROVAL: string;
    TRANSPORT_APPROVAL: string;
    execute: (
      prisma: PrismaClient,
      mode: string,
      env: NodeJS.ProcessEnv,
    ) => Promise<unknown>;
  };
const databaseUrl = process.env.TEST_DATABASE_URL;
if (process.env.CI && !databaseUrl)
  throw new Error('TEST_DATABASE_URL_REQUIRED');
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Pinned first Population campaign on PostgreSQL 16', () => {
  const prisma = new PrismaClient(
    databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined,
  );
  const target = operation.TARGET;
  const previousEnvironment = { ...process.env };
  const originalFetch = global.fetch;
  const phone = '+15145550123';
  const email = 'commissioning@example.invalid';
  const digest = (value: string) =>
    createHash('sha256').update(value).digest('hex');
  let service: PopulationService;
  let readiness: PopulationReadinessService;
  let alertId: string;
  let scenarioId: string;
  let fetchMock: jest.Mock;

  async function cleanup() {
    const scope = { program: { publicSlug: target.publicSlug } };
    await prisma.demoCommunicationEvent.deleteMany({
      where: { organizationId: target.organizationId },
    });
    await prisma.auditLog.deleteMany({
      where: { organizationId: target.organizationId },
    });
    await prisma.populationDeliveryProviderEvent.deleteMany({
      where: { delivery: { alert: scope } },
    });
    await prisma.populationAlertDelivery.deleteMany({
      where: { alert: scope },
    });
    await prisma.populationAlertInstitutionTarget.deleteMany({
      where: { alert: scope },
    });
    await prisma.populationAlertZone.deleteMany({ where: { alert: scope } });
    await prisma.populationAlert.deleteMany({ where: scope });
    await prisma.populationOperationalEvent.deleteMany({
      where: { organizationId: target.organizationId },
    });
    await prisma.populationSmsConsentEvidence.deleteMany({ where: scope });
    await prisma.populationConsentEvent.deleteMany({ where: scope });
    await prisma.populationSubscriber.deleteMany({ where: scope });
    await prisma.populationProgram.deleteMany({
      where: { publicSlug: target.publicSlug },
    });
    const profile = await prisma.rueFacilityProfile.findUnique({
      where: { buildingId: target.buildingId },
    });
    if (profile) {
      await prisma.rueImpactZone.deleteMany({
        where: { scenario: { facilityProfileId: profile.id } },
      });
      await prisma.rueEmergencyScenario.deleteMany({
        where: { facilityProfileId: profile.id },
      });
      await prisma.rueFacilityProfile.delete({ where: { id: profile.id } });
    }
    await prisma.projectFile.deleteMany({
      where: { buildingId: target.buildingId },
    });
    await prisma.building.deleteMany({ where: { id: target.buildingId } });
    await prisma.clientUser.deleteMany({
      where: { clientId: target.clientId },
    });
    await prisma.client.deleteMany({ where: { id: target.clientId } });
    await prisma.demoEnvironment.deleteMany({
      where: { organizationId: target.organizationId },
    });
    await prisma.user.deleteMany({
      where: { organizationId: target.organizationId },
    });
    await prisma.organization.deleteMany({
      where: { id: target.organizationId },
    });
  }

  beforeEach(async () => {
    await cleanup();
    Object.assign(process.env, {
      CORO_POPULATION_RECIPIENT_ENROLLMENT: 'true',
      CORO_POPULATION_RECIPIENT_ENROLLMENT_APPROVAL: operation.APPROVAL,
      CORO_POPULATION_CONTROLLED_TRANSPORT_APPROVAL:
        operation.TRANSPORT_APPROVAL,
      POPULATION_CONTROLLED_LIVE_TEST_ENABLED: 'false',
      POPULATION_CONTROLLED_LIVE_TEST_STOP: 'true',
      POPULATION_CONTROLLED_LIVE_TEST_ORGANIZATION_ID: target.organizationId,
      POPULATION_CONTROLLED_LIVE_TEST_PROGRAM_ID: target.programId,
      POPULATION_CONTROLLED_LIVE_TEST_EXPIRES_AT: new Date(
        Date.now() + 1800000,
      ).toISOString(),
      POPULATION_CONTROLLED_LIVE_TEST_SMS_SHA256: digest(phone),
      POPULATION_CONTROLLED_LIVE_TEST_EMAIL_SHA256: digest(email),
      POPULATION_CONTROLLED_LIVE_TEST_MAX_CAMPAIGN_CAD_CENTS: '100',
      POPULATION_CONTROLLED_LIVE_TEST_SMS_CANADA_CAD_MICROS_PER_SEGMENT:
        '20000',
      POPULATION_CONTROLLED_LIVE_TEST_EMAIL_CAD_MICROS_PER_MESSAGE: '0',
      POPULATION_SMS_PRODUCTION_VALIDATED: 'false',
      POPULATION_SMS_TFN_APPROVED: 'true',
      POPULATION_BREVO_EMAIL_SENDER_VERIFIED: 'true',
      BREVO_SMS_SENDER: '+18335886812',
      BREVO_SENDER_EMAIL: 'sender@example.invalid',
      BREVO_API_KEY: 'synthetic-only',
      POPULATION_BREVO_WEBHOOK_SECRET: 'e'.repeat(40),
      POPULATION_BREVO_SMS_WEBHOOK_SECRET: 's'.repeat(40),
      POPULATION_OTP_SECRET: 'o'.repeat(40),
      POPULATION_ACCESS_SECRET: 'a'.repeat(40),
      POPULATION_ACCESS_REQUEST_TOKEN_SECRET: '11'.repeat(32),
      POPULATION_LOCATION_TOKEN_SECRET: '22'.repeat(32),
    });
    fetchMock = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            messageId: `synthetic-provider-${fetchMock.mock.calls.length}`,
          }),
          { status: 201 },
        ),
    );
    global.fetch = fetchMock as typeof fetch;
    await prisma.organization.create({
      data: { id: target.organizationId, name: 'Pinned synthetic QA' },
    });
    await prisma.client.create({
      data: {
        id: target.clientId,
        organizationId: target.organizationId,
        name: 'Pinned synthetic client',
        regulatoryRequirements: [],
      },
    });
    const operator = await prisma.user.create({
      data: {
        email: target.operatorEmail,
        organizationId: target.organizationId,
        password: 'not-a-login-secret',
        firstName: 'QA',
        lastName: 'Operator',
        role: 'ADMIN',
      },
    });
    await prisma.demoEnvironment.create({
      data: {
        organizationId: target.organizationId,
        fixtureNamespace: 'pinned-commissioning-postgres',
        referenceEmailHash: digest(email),
        status: 'ACTIVE',
        communicationMode: 'SIMULATE',
        externalProvidersDisabled: true,
      },
    });
    const setup = await setupPopulationControlledTest(prisma, {
      allowSetup: 'true',
      environment: 'CORO_DEMO_SP_OPS_04B',
      organizationId: target.organizationId,
      clientId: target.clientId,
      allowedClientId: target.clientId,
      buildingId: target.buildingId,
      publicSlug: target.publicSlug,
      actorUserId: operator.id,
      dryRun: 'false',
    });
    scenarioId = setup.scenarioId;
    await operation.execute(prisma, 'OPEN', process.env);
    for (const [id, role, permissions] of [
      [
        target.preparerId,
        'CLIENT_MANAGER',
        ['POPULATION_PREPARE', 'POPULATION_SEND'],
      ],
      [target.approverId, 'CLIENT_CORPORATE', ['POPULATION_APPROVE']],
    ] as const)
      await prisma.clientUser.create({
        data: {
          id,
          email: `${id}@example.invalid`,
          password: 'not-a-login-secret',
          firstName: 'QA',
          lastName: role,
          role,
          populationPermissions: [...permissions],
          buildingIds: [target.buildingId],
          organizationId: target.organizationId,
          clientId: target.clientId,
        },
      });
    await prisma.populationSubscriber.create({
      data: {
        programId: target.programId,
        status: 'ACTIVE',
        isSynthetic: false,
        email,
        emailCanonical: email,
        phone,
        phoneCanonical: phone,
        smsEnabled: true,
        emailEnabled: true,
        latitude: 45.5,
        longitude: -73.4,
        locationSource: 'SYNTHETIC_QA',
        locationResolvedAt: new Date(),
        identityAuthorityAt: new Date(),
        verifiedAt: new Date(),
        consentEvents: {
          create: {
            programId: target.programId,
            type: 'VERIFIED',
            consentVersion: 'sp-ops-04b-controlled-test-v1',
            smsEnabled: true,
            emailEnabled: true,
            source: 'SYNTHETIC_QA',
          },
        },
        smsConsentEvidence: {
          create: {
            programId: target.programId,
            consentVersion: 'sp-ops-04b-controlled-test-v1',
            language: 'FR',
            disclosureSnapshot: 'SYNTHETIC TEST CONSENT ONLY',
            source: 'SYNTHETIC_QA',
            surface: 'SYNTHETIC_QA',
            smsEnabled: true,
            emailEnabled: true,
            submittedAt: new Date(),
            verifiedAt: new Date(),
          },
        },
        verifications: {
          create: ['SMS', 'EMAIL'].map((channel) => ({
            channel: channel as 'SMS' | 'EMAIL',
            codeHash: 'not-an-otp',
            expiresAt: new Date(),
            verifiedAt: new Date(),
          })),
        },
      },
    });
    const file = await prisma.projectFile.create({
      data: {
        organizationId: target.organizationId,
        buildingId: target.buildingId,
        name: 'FICTITIOUS-QA.pdf',
        category: 'documents_reference',
        size: 1,
        mimeType: 'application/pdf',
        storageKey: 'synthetic/pinned-source',
        url: 'private:project-file',
        uploadedById: operator.id,
        visibility: 'shared',
        status: 'valide',
        lifecycleState: 'APPROVED',
        effectiveAt: new Date(Date.now() - 1000),
      },
    });
    const db = prisma as unknown as PrismaService;
    const phones = new PhoneNumberService();
    readiness = new PopulationReadinessService(process.env);
    service = new PopulationService(
      db,
      new PopulationGeospatialService(),
      new PopulationDeliveryService(new DemoCommunicationPolicyService(db)),
      {} as never,
      readiness,
      new PopulationOperationalEventsService(db),
      phones,
      new PopulationSmsSuppressionService(db, phones),
      undefined,
      new PopulationControlledLiveTestService(),
    );
    await service.updateDispersionBasis(target.buildingId, scenarioId, {
      sourceProjectFileId: file.id,
      modelName: 'FICTITIOUS QA - no physical model',
      modelVersion: 'QA',
      studyTitle: 'FICTITIOUS QA SOURCE',
      studyReference: 'QA-ONLY',
      studyDate: new Date().toISOString(),
      endpointName: 'ARBITRARY QA',
      endpointConcentrationPpm: 1,
      endpointAveragingTimeSeconds: 60,
      windSpeedMetersPerSecond: 0,
      atmosphericStabilityClass: 'QA',
      releaseDurationSeconds: 60,
      receptorHeightMeters: 0,
      assumptions: 'Fictitious isolated software fixture only.',
      limitations: 'No real engineering or protective validity.',
    });
    const reviewer = { type: 'CLIENT_USER' as const, id: target.approverId };
    await service.reviewDispersionBasis(
      target.buildingId,
      scenarioId,
      { confirmed: true },
      reviewer,
    );
    await service.updateImpactZoneGovernance(
      target.buildingId,
      scenarioId,
      setup.zoneId,
      {
        purpose: 'PUBLIC_NOTIFICATION',
        determinationMethod: 'Fictitious QA circle',
        sourceReference: 'QA-ONLY',
      },
    );
    await service.setImpactZoneAlertingApproval(
      target.buildingId,
      scenarioId,
      setup.zoneId,
      { approved: true },
      reviewer,
    );
    const draft = await service.createAlertDraft(
      target.buildingId,
      {
        scenarioId,
        type: 'TEST',
        targetingConfirmed: true,
        titleFR: 'EXERCICE / TEST CORO - QA',
        titleEN: 'EXERCISE / TEST CORO - QA',
        messageFR: 'EXERCICE / TEST CORO - AUCUNE URGENCE REELLE.',
        messageEN: 'EXERCISE / TEST CORO - NO REAL EMERGENCY.',
      },
      { type: 'CLIENT_USER', id: target.preparerId },
    );
    alertId = draft!.id;
    process.env.POPULATION_CONTROLLED_LIVE_TEST_ALERT_ID = alertId;
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    process.env = { ...previousEnvironment };
    await cleanup();
  });
  afterAll(async () => prisma.$disconnect());

  async function frozen() {
    await operation.execute(prisma, 'ARM', process.env);
    await service.markAlertDraftReady(target.buildingId, alertId, {
      type: 'CLIENT_USER',
      id: target.preparerId,
    });
    const ready = await prisma.populationAlert.findUniqueOrThrow({
      where: { id: alertId },
    });
    const scenario = await prisma.rueEmergencyScenario.findUniqueOrThrow({
      where: { id: scenarioId },
    });
    expect(ready.contextSnapshot).toMatchObject({
      scenario: {
        scientificGovernance: {
          scenarioUpdatedAt: scenario.updatedAt.toISOString(),
          dispersionReviewedAt: scenario.dispersionReviewedAt!.toISOString(),
          sourceDocumentId: scenario.dispersionSourceFileId,
        },
      },
    });
    await service.approveAlert(target.buildingId, alertId, {
      type: 'CLIENT_USER',
      id: target.approverId,
    });
    await service.freezeAlertRecipients(target.buildingId, alertId, {
      type: 'CLIENT_USER',
      id: target.preparerId,
    });
  }

  it('arms idempotently, freezes under STOP and shows an honest non-ready preview', async () => {
    await operation.execute(prisma, 'ARM', process.env);
    await operation.execute(prisma, 'ARM', process.env);
    expect(
      await prisma.auditLog.count({
        where: { action: 'POPULATION_CONTROLLED_TRANSPORT_PREPARED' },
      }),
    ).toBe(1);
    await frozen();
    const preview = await service.getAlertLivePreflight(
      target.buildingId,
      alertId,
    );
    expect(preview.ready).toBe(false);
    expect(preview.blockingReasons).toEqual(
      expect.arrayContaining([
        'CONTROLLED_TEST_TRANSPORT_DISABLED',
        'POPULATION_CONTROLLED_LIVE_TEST_STOPPED',
      ]),
    );
    expect(preview.controlledTest).toMatchObject({
      prepared: true,
      enabled: false,
      cost: {
        smsSegments: 1,
        emailMessages: 1,
        estimatedCadMicros: 20000,
        budgetCadMicros: 1000000,
      },
    });
    expect(preview.controlledTest.destinations).toHaveLength(2);
    expect(JSON.stringify(preview)).not.toContain(email);
    expect(JSON.stringify(preview)).not.toContain(phone);
    expect(readiness.getReadiness().population.sms).toBe('NOT_VALIDATED');
    await expect(
      service.sendAlert(target.buildingId, alertId),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      await prisma.populationAlertDelivery.count({
        where: { alertId, status: 'QUEUED' },
      }),
    ).toBe(2);
  });

  it('makes at most one mocked provider call per channel despite concurrent senders', async () => {
    await frozen();
    process.env.POPULATION_CONTROLLED_LIVE_TEST_ENABLED = 'true';
    process.env.POPULATION_CONTROLLED_LIVE_TEST_STOP = 'false';
    await Promise.allSettled([
      service.sendAlert(target.buildingId, alertId),
      service.sendAlert(target.buildingId, alertId),
    ]);
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith('/transactionalSMS/send'),
      ),
    ).toHaveLength(1);
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith('/smtp/email'),
      ),
    ).toHaveLength(1);
    const deliveries = await prisma.populationAlertDelivery.findMany({
      where: { alertId },
    });
    expect(deliveries).toHaveLength(2);
    expect(
      deliveries.every((d) => d.status === 'SENT' && d.attemptCount === 1),
    ).toBe(true);
    expect(process.env.POPULATION_SMS_PRODUCTION_VALIDATED).toBe('false');
    process.env.POPULATION_CONTROLLED_LIVE_TEST_EXPIRES_AT = new Date(
      Date.now() - 1000,
    ).toISOString();
    await prisma.demoEnvironment.update({
      where: { organizationId: target.organizationId },
      data: { status: 'PAUSED' },
    });
    await operation.execute(prisma, 'DISARM', process.env);
    expect(
      await prisma.populationProgram.findUnique({
        where: { id: target.programId },
      }),
    ).toMatchObject({ status: 'SUSPENDED', deliveryMode: 'SANDBOX' });
    expect(
      await prisma.populationAlertDelivery.count({ where: { alertId } }),
    ).toBe(2);
    await expect(
      service.processSendingAlertBatch(
        target.buildingId,
        alertId,
        target.programId,
      ),
    ).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never recovers an ambiguous provider outcome into another attempt', async () => {
    await frozen();
    process.env.POPULATION_CONTROLLED_LIVE_TEST_ENABLED = 'true';
    process.env.POPULATION_CONTROLLED_LIVE_TEST_STOP = 'false';
    fetchMock.mockImplementation(
      async (url: string) =>
        new Response(
          JSON.stringify({
            messageId: 'synthetic-provider',
            message: 'synthetic failure',
          }),
          { status: url.endsWith('/smtp/email') ? 500 : 201 },
        ),
    );
    await service.sendAlert(target.buildingId, alertId);
    const ambiguous = await prisma.populationAlertDelivery.findFirstOrThrow({
      where: { alertId, channel: 'EMAIL' },
    });
    expect(ambiguous).toMatchObject({
      status: 'SENDING',
      attemptCount: 1,
      nextAttemptAt: null,
    });
    expect(ambiguous.outcomeUnknownAt).not.toBeNull();
    await prisma.populationAlertDelivery.update({
      where: { id: ambiguous.id },
      data: { leaseExpiresAt: new Date(0) },
    });
    await service.processSendingAlertBatch(
      target.buildingId,
      alertId,
      target.programId,
    );
    await expect(
      service.dispatchAlertDelivery(target.buildingId, alertId, ambiguous.id),
    ).rejects.toThrow('CONTROLLED_TEST_ATTEMPT_ALREADY_CONSUMED');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    'expired',
    'disabled',
    'stopped',
    'wrong-pin',
    'scope-drift',
    'paused',
    'block',
  ])(
    'fails closed for %s even if global SMS becomes validated',
    async (reason) => {
      await frozen();
      process.env.POPULATION_CONTROLLED_LIVE_TEST_ENABLED = 'true';
      process.env.POPULATION_CONTROLLED_LIVE_TEST_STOP = 'false';
      process.env.POPULATION_SMS_PRODUCTION_VALIDATED = 'true';
      if (reason === 'expired')
        process.env.POPULATION_CONTROLLED_LIVE_TEST_EXPIRES_AT = new Date(
          0,
        ).toISOString();
      if (reason === 'disabled')
        process.env.POPULATION_CONTROLLED_LIVE_TEST_ENABLED = 'false';
      if (reason === 'stopped')
        process.env.POPULATION_CONTROLLED_LIVE_TEST_STOP = 'true';
      if (reason === 'wrong-pin')
        process.env.POPULATION_CONTROLLED_LIVE_TEST_ALERT_ID = 'other-alert';
      if (reason === 'scope-drift')
        process.env.POPULATION_CONTROLLED_LIVE_TEST_PROGRAM_ID =
          'other-program';
      if (reason === 'paused' || reason === 'block')
        await prisma.demoEnvironment.update({
          where: { organizationId: target.organizationId },
          data:
            reason === 'paused'
              ? { status: 'PAUSED' }
              : { communicationMode: 'BLOCK' },
        });
      await service
        .sendAlert(target.buildingId, alertId)
        .catch(() => undefined);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(
        await prisma.populationAlertDelivery.count({
          where: { alertId, status: 'SENT' },
        }),
      ).toBe(0);
    },
  );

  it('rechecks a subscriber changed while ARM waits on its row lock', async () => {
    const owner = await prisma.populationSubscriber.findFirstOrThrow({
      where: { programId: target.programId, isSynthetic: false },
    });
    let arm!: Promise<unknown>;
    try {
      await prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM "PopulationSubscriber" WHERE id = ${owner.id} FOR UPDATE`;
          arm = operation.execute(prisma, 'ARM', process.env);
          void arm.catch(() => undefined);
          // Observe the actual PostgreSQL lock wait, not a fixed scheduling delay.
          const deadline = Date.now() + 3000;
          let observedLockWait = false;
          while (Date.now() < deadline) {
            const waiting = await prisma.$queryRaw<
              Array<{ count: bigint }>
            >`SELECT count(*) FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND query LIKE '%PopulationSubscriber%FOR SHARE%'`;
            if (Number(waiting[0]?.count) > 0) {
              observedLockWait = true;
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
          expect(observedLockWait).toBe(true);
          await tx.populationSubscriber.update({
            where: { id: owner.id },
            data: {
              email: 'changed@example.invalid',
              emailCanonical: 'changed@example.invalid',
            },
          });
        },
        { timeout: 10000 },
      );
    } finally {
      if (arm) await Promise.allSettled([arm]);
    }
    await expect(arm).rejects.toThrow('QA_VERIFIED_RECIPIENT_INVALID');
    expect(
      await prisma.populationProgram.findUnique({
        where: { id: target.programId },
      }),
    ).toMatchObject({ deliveryMode: 'SANDBOX' });
    expect(
      await prisma.auditLog.count({
        where: { action: 'POPULATION_CONTROLLED_TRANSPORT_PREPARED' },
      }),
    ).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
