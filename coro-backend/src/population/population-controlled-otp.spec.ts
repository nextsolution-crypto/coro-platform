import { DemoCommunicationChannel } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';
import { controlledOtpAllowed } from './population-controlled-otp';
import { DemoCommunicationPolicyService } from '../demo-environment/demo-communication-policy.service';
const recipient = '+15145550123';
const scope = {
  organizationId: 'qa-org',
  programId: 'qa-program',
  channel: 'SMS',
  recipient,
};
const deadline = new Date(Date.now() + 30 * 60 * 1000).toISOString();
const configuration = {
  POPULATION_CONTROLLED_OTP_ENABLED: 'true',
  POPULATION_CONTROLLED_OTP_EXPIRES_AT: deadline,
  POPULATION_CONTROLLED_LIVE_TEST_ENABLED: 'false',
  POPULATION_CONTROLLED_LIVE_TEST_STOP: 'true',
  POPULATION_CONTROLLED_LIVE_TEST_ORGANIZATION_ID: scope.organizationId,
  POPULATION_CONTROLLED_LIVE_TEST_PROGRAM_ID: scope.programId,
  POPULATION_CONTROLLED_LIVE_TEST_SMS_SHA256: createHash('sha256')
    .update(recipient)
    .digest('hex'),
  POPULATION_SMS_TFN_APPROVED: 'true',
  BREVO_SMS_SENDER: '+18335886812',
};

describe('Controlled Population OTP commissioning', () => {
  const previous = { ...process.env };
  afterEach(() => {
    process.env = { ...previous };
  });
  it('allows only the exact scoped, expiring OTP without declaring SMS production ready', () => {
    expect(controlledOtpAllowed(configuration, scope)).toBe(true);
    expect(configuration).not.toHaveProperty(
      'POPULATION_SMS_PRODUCTION_VALIDATED',
    );
  });
  it.each([
    { POPULATION_CONTROLLED_OTP_ENABLED: 'false' },
    { POPULATION_CONTROLLED_OTP_EXPIRES_AT: new Date(0).toISOString() },
    {
      POPULATION_CONTROLLED_OTP_EXPIRES_AT: new Date(
        Date.now() + 2 * 3600000,
      ).toISOString(),
    },
    { POPULATION_CONTROLLED_LIVE_TEST_ENABLED: 'true' },
    { POPULATION_CONTROLLED_LIVE_TEST_STOP: 'false' },
    { POPULATION_SMS_TFN_APPROVED: 'false' },
    { BREVO_SMS_SENDER: 'CORO' },
    { POPULATION_CONTROLLED_LIVE_TEST_SMS_SHA256: 'bad' },
  ])('refuses an unsafe commissioning configuration %j', (changes) => {
    expect(controlledOtpAllowed({ ...configuration, ...changes }, scope)).toBe(
      false,
    );
  });
  it.each([
    { organizationId: 'other' },
    { programId: 'other' },
    { recipient: '+15145550999' },
    { channel: 'WEBHOOK' },
  ])('refuses scope substitution %j', (changes) => {
    expect(controlledOtpAllowed(configuration, { ...scope, ...changes })).toBe(
      false,
    );
  });
  function harness() {
    const environment = {
      status: 'ACTIVE',
      communicationMode: 'SIMULATE',
      externalProvidersDisabled: true,
    };
    const program = {
      status: 'ACTIVE',
      registrationEnabled: true,
      deliveryMode: 'SANDBOX',
      governanceMode: 'DUAL_CONTROL',
      smsEnabled: true,
      rueFacilityProfile: {
        building: { organizationId: scope.organizationId },
      },
      subscribers: [
        { status: 'PENDING_VERIFICATION', phoneCanonical: recipient },
      ],
    };
    let event: { id: string } | null = null;
    const tx = {
      $executeRaw: jest.fn(),
      demoEnvironment: { findUnique: jest.fn().mockResolvedValue(environment) },
      populationProgram: { findUnique: jest.fn().mockResolvedValue(program) },
      demoCommunicationEvent: {
        findUnique: jest.fn(() => Promise.resolve(event)),
        create: jest.fn((_input: { data: Record<string, unknown> }) => {
          void _input;
          event = { id: 'claim' };
          return Promise.resolve(event);
        }),
      },
    };
    const prisma = {
      demoEnvironment: tx.demoEnvironment,
      $transaction: jest.fn((fn: (value: typeof tx) => Promise<unknown>) =>
        fn(tx),
      ),
    };
    return {
      service: new DemoCommunicationPolicyService(
        prisma as unknown as PrismaService,
      ),
      tx,
      environment,
      program,
    };
  }
  const request = {
    organizationId: scope.organizationId,
    channel: DemoCommunicationChannel.SMS,
    operation: 'POPULATION_SUBSCRIBER_OTP',
    recipient,
    payload: { message: 'private OTP' },
    populationOtpProgramId: scope.programId,
  };
  it('claims exactly one transport and blocks a duplicate, without persisting the OTP', async () => {
    Object.assign(process.env, configuration);
    const h = harness();
    expect(await h.service.evaluate(request)).toEqual({ disposition: 'LIVE' });
    expect(
      await h.service.evaluate({ ...request, recipient: '+1 (514) 555-0123' }),
    ).toEqual({
      disposition: 'BLOCKED',
      eventId: 'claim',
    });
    expect(h.tx.demoCommunicationEvent.create).toHaveBeenCalledTimes(1);
    expect(
      JSON.stringify(h.tx.demoCommunicationEvent.create.mock.calls),
    ).not.toContain('private OTP');
    expect(h.tx.$executeRaw).toHaveBeenCalled();
  });
  it.each([
    'PAUSED',
    'BLOCK',
    'LIVE_PROGRAM',
    'STANDARD',
    'WRONG_TENANT',
    'SECOND_RECIPIENT',
  ])('blocks %s at the canonical transport boundary', async (change) => {
    Object.assign(process.env, configuration);
    const h = harness();
    if (change === 'PAUSED') h.environment.status = 'PAUSED';
    if (change === 'BLOCK') h.environment.communicationMode = 'BLOCK';
    if (change === 'LIVE_PROGRAM') h.program.deliveryMode = 'LIVE';
    if (change === 'STANDARD') h.program.governanceMode = 'STANDARD';
    if (change === 'WRONG_TENANT')
      h.program.rueFacilityProfile.building.organizationId = 'other';
    if (change === 'SECOND_RECIPIENT')
      h.program.subscribers.push({
        status: 'ACTIVE',
        phoneCanonical: recipient,
      });
    expect(
      await h.service.evaluate({ ...request, recipient: '+1 (514) 555-0123' }),
    ).toEqual({
      disposition: 'BLOCKED',
      eventId: 'claim',
    });
  });
});
