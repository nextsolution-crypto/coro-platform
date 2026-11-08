import { createHash } from 'crypto';
import { DemoCommunicationPolicyService } from '../src/demo-environment/demo-communication-policy.service';
import type { PrismaService } from '../src/prisma/prisma.service';
/* eslint-disable @typescript-eslint/no-require-imports */
import { PrismaClient } from '@prisma/client';
import { setupPopulationControlledTest } from '../src/admin/population-controlled-test-setup';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;
// The governed runtime is intentionally CommonJS because the production workflow streams it into the backend container.
const enrollment =
  require('../../ops/population/population-live-recipient-enrollment.cjs') as {
    APPROVAL: string;
    TARGET: {
      organizationId: string;
      clientId: string;
      buildingId: string;
      publicSlug: string;
      operatorEmail: string;
    };
    execute: (
      prisma: PrismaClient,
      mode: 'OPEN' | 'CLOSE',
      env: Record<string, string>,
    ) => Promise<Record<string, unknown>>;
  };

describePostgres(
  'Population recipient enrollment audit authority on PostgreSQL',
  () => {
    const prisma = databaseUrl
      ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
      : new PrismaClient();
    const safeEnvironment = {
      CORO_POPULATION_RECIPIENT_ENROLLMENT: 'true',
      CORO_POPULATION_RECIPIENT_ENROLLMENT_APPROVAL: enrollment.APPROVAL,
      POPULATION_CONTROLLED_LIVE_TEST_ENABLED: 'false',
      POPULATION_CONTROLLED_LIVE_TEST_STOP: 'true',
    };

    async function cleanup() {
      const profile = await prisma.rueFacilityProfile.findUnique({
        where: { buildingId: enrollment.TARGET.buildingId },
        select: { id: true },
      });
      await prisma.demoCommunicationEvent.deleteMany({
        where: { organizationId: enrollment.TARGET.organizationId },
      });
      await prisma.auditLog.deleteMany({
        where: { organizationId: enrollment.TARGET.organizationId },
      });
      await prisma.populationProgram.deleteMany({
        where: { publicSlug: enrollment.TARGET.publicSlug },
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
      await prisma.building.deleteMany({
        where: { id: enrollment.TARGET.buildingId },
      });
      await prisma.demoEnvironment.deleteMany({
        where: { organizationId: enrollment.TARGET.organizationId },
      });
      await prisma.user.deleteMany({
        where: { email: enrollment.TARGET.operatorEmail },
      });
      await prisma.client.deleteMany({
        where: { id: enrollment.TARGET.clientId },
      });
      await prisma.organization.deleteMany({
        where: { id: enrollment.TARGET.organizationId },
      });
    }

    beforeEach(cleanup);
    afterEach(cleanup);
    afterAll(async () => prisma.$disconnect());

    it('persists OPEN and CLOSE with exactly one validated internal actor', async () => {
      await prisma.organization.create({
        data: {
          id: enrollment.TARGET.organizationId,
          name: 'CORO Demo enrollment PostgreSQL QA',
        },
      });
      await prisma.client.create({
        data: {
          id: enrollment.TARGET.clientId,
          name: 'Ateliers du Saint-Laurent Demo',
          regulatoryRequirements: [],
          organizationId: enrollment.TARGET.organizationId,
        },
      });
      const operator = await prisma.user.create({
        data: {
          email: enrollment.TARGET.operatorEmail,
          password: 'not-a-login-secret',
          firstName: 'Demo',
          lastName: 'CORO',
          role: 'ADMIN',
          organizationId: enrollment.TARGET.organizationId,
        },
      });
      await prisma.demoEnvironment.create({
        data: {
          organizationId: enrollment.TARGET.organizationId,
          fixtureNamespace: 'sp-ops-04b-enrollment-postgres',
          referenceEmailHash: 'a'.repeat(64),
          status: 'ACTIVE',
          communicationMode: 'SIMULATE',
          externalProvidersDisabled: true,
        },
      });
      await setupPopulationControlledTest(prisma, {
        allowSetup: 'true',
        environment: 'CORO_DEMO_SP_OPS_04B',
        organizationId: enrollment.TARGET.organizationId,
        clientId: enrollment.TARGET.clientId,
        allowedClientId: enrollment.TARGET.clientId,
        buildingId: enrollment.TARGET.buildingId,
        publicSlug: enrollment.TARGET.publicSlug,
        actorUserId: operator.id,
        dryRun: 'false',
      });

      const actorConstraint = await prisma.$queryRaw<
        Array<{ definition: string }>
      >`SELECT pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conname = 'AuditLog_exactly_one_actor_check'`;
      expect(actorConstraint).toHaveLength(1);
      expect(actorConstraint[0]?.definition).toContain('userId');
      expect(actorConstraint[0]?.definition).toContain('clientUserId');

      await expect(
        enrollment.execute(prisma, 'OPEN', safeEnvironment),
      ).resolves.toMatchObject({
        execution: 'PASS',
        mode: 'OPEN',
        status: 'ACTIVE',
        registrationEnabled: true,
      });
      // Two concurrent OTP requests must obtain only one durable transport claim.
      const qaProgram = await prisma.populationProgram.findUniqueOrThrow({
        where: { publicSlug: enrollment.TARGET.publicSlug },
      });
      const qaPhone = '+15145550123';
      await prisma.populationSubscriber.create({
        data: {
          programId: qaProgram.id,
          isSynthetic: false,
          status: 'PENDING_VERIFICATION',
          phone: qaPhone,
          phoneCanonical: qaPhone,
          smsEnabled: true,
        },
      });
      const previousEnvironment = { ...process.env };
      try {
        Object.assign(process.env, safeEnvironment, {
          POPULATION_CONTROLLED_OTP_ENABLED: 'true',
          POPULATION_CONTROLLED_OTP_EXPIRES_AT: new Date(
            Date.now() + 1800000,
          ).toISOString(),
          POPULATION_CONTROLLED_LIVE_TEST_ORGANIZATION_ID:
            enrollment.TARGET.organizationId,
          POPULATION_CONTROLLED_LIVE_TEST_PROGRAM_ID: qaProgram.id,
          POPULATION_CONTROLLED_LIVE_TEST_SMS_SHA256: createHash('sha256')
            .update(qaPhone)
            .digest('hex'),
          POPULATION_SMS_TFN_APPROVED: 'true',
          BREVO_SMS_SENDER: '+18335886812',
        });
        const policy = new DemoCommunicationPolicyService(
          prisma as unknown as PrismaService,
        );
        const request = {
          organizationId: enrollment.TARGET.organizationId,
          channel: 'SMS' as const,
          operation: 'POPULATION_SUBSCRIBER_OTP',
          recipient: qaPhone,
          payload: { message: 'synthetic OTP only' },
          populationOtpProgramId: qaProgram.id,
        };
        const decisions = await Promise.all([
          policy.evaluate(request),
          policy.evaluate(request),
        ]);
        expect(decisions.map((value) => value.disposition).sort()).toEqual([
          'BLOCKED',
          'LIVE',
        ]);
        expect(
          await prisma.demoCommunicationEvent.count({
            where: {
              organizationId: enrollment.TARGET.organizationId,
              operation: 'POPULATION_SUBSCRIBER_OTP',
              simulated: false,
              blocked: false,
            },
          }),
        ).toBe(1);
      } finally {
        process.env = previousEnvironment;
      }

      await expect(
        enrollment.execute(prisma, 'CLOSE', safeEnvironment),
      ).resolves.toMatchObject({
        execution: 'PASS',
        mode: 'CLOSE',
        status: 'CONFIGURING',
        registrationEnabled: false,
      });

      const auditRows = await prisma.auditLog.findMany({
        where: {
          entityType: 'PopulationProgram',
          action: {
            in: [
              'POPULATION_CONTROLLED_RECIPIENT_ENROLLMENT_OPENED',
              'POPULATION_CONTROLLED_RECIPIENT_ENROLLMENT_CLOSED',
            ],
          },
        },
        select: { action: true, userId: true, clientUserId: true },
      });
      expect(auditRows).toHaveLength(2);
      expect(auditRows).toEqual(
        expect.arrayContaining([
          {
            action: 'POPULATION_CONTROLLED_RECIPIENT_ENROLLMENT_OPENED',
            userId: operator.id,
            clientUserId: null,
          },
          {
            action: 'POPULATION_CONTROLLED_RECIPIENT_ENROLLMENT_CLOSED',
            userId: operator.id,
            clientUserId: null,
          },
        ]),
      );
    });
  },
);
