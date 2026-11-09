import { createHash } from 'crypto';
import { DemoCommunicationPolicyService } from './demo-communication-policy.service';
import { PopulationDeliveryService } from '../population/population-delivery.service';
const org = '916f54ec-af22-45e0-99db-a369d9630002';
const address = 'demo-client@getcoro.io';
const hash = (v: string) => createHash('sha256').update(v).digest('hex');
describe('Sentinelle demo real email recipient', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  });
  function harness() {
    process.env.DEMO_AUTH_EMAIL_LIVE_RECIPIENT_SHA256_ALLOWLIST = hash(address);
    const environment = {
      status: 'ACTIVE',
      communicationMode: 'SIMULATE',
      externalProvidersDisabled: true,
    };
    const account = {
      organizationId: org,
      isActive: true,
      client: { isActive: true },
    };
    const incident = {
      organizationId: org,
      isActive: true,
      status: 'ACTIVE',
      building: { organizationId: org },
    };
    const delivery = {
      organizationId: org,
      channel: 'EMAIL',
      purpose: 'OCCUPANT_ALERT',
      recipientHash: hash(address),
      status: 'PROCESSING',
      createdAt: new Date(),
      incidentEvent: incident,
    };
    const prisma = {
      demoEnvironment: { findUnique: jest.fn().mockResolvedValue(environment) },
      clientUser: { findUnique: jest.fn().mockResolvedValue(account) },
      incidentNotificationDelivery: {
        findUnique: jest.fn().mockResolvedValue(delivery),
      },
      demoCommunicationEvent: {
        upsert: jest.fn().mockResolvedValue({ id: 'event-a' }),
      },
    };
    const service = new DemoCommunicationPolicyService(prisma as any);
    const request = {
      organizationId: org,
      channel: 'EMAIL' as any,
      operation: 'OCCUPANT_ALERT',
      recipient: address,
      payload: {},
      idempotencyKey: 'delivery-a',
    };
    return {
      prisma,
      service,
      environment,
      account,
      delivery,
      incident,
      request,
    };
  }
  it('permits the configured active recipient and keeps real evidence separate', async () => {
    const h = harness();
    expect((await h.service.evaluate(h.request)).disposition).toBe('LIVE');
    expect(h.prisma.demoCommunicationEvent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          simulated: false,
          blocked: false,
          idempotencyKey: 'SENTINELLE_DEMO_REAL_EMAIL_V1:delivery-a',
        }),
      }),
    );
  });
  it.each([
    'COORDINATOR_ALERT',
    'MEMBER_ALERT',
    'OCCUPANT_ALERT',
    'TASK_ACK_ESCALATION_LEVEL_1',
    'TASK_ACK_ESCALATION_LEVEL_2',
  ])('permits canonical purpose %s', async (operation) => {
    const h = harness();
    h.request.operation = operation;
    h.delivery.purpose = operation;
    expect((await h.service.evaluate(h.request)).disposition).toBe('LIVE');
  });
  it.each(['PAUSED', 'ARCHIVED'])('keeps %s blocking', async (status) => {
    const h = harness();
    h.environment.status = status;
    expect((await h.service.evaluate(h.request)).disposition).toBe('BLOCKED');
  });
  it('keeps BLOCK above recipient exceptions', async () => {
    const h = harness();
    h.environment.communicationMode = 'BLOCK';
    expect((await h.service.evaluate(h.request)).disposition).toBe('BLOCKED');
  });
  it('keeps other recipients simulated even if authentication-authorized', async () => {
    const h = harness();
    h.request.recipient = 'other@example.invalid';
    process.env.DEMO_AUTH_EMAIL_LIVE_RECIPIENT_SHA256_ALLOWLIST +=
      ',' + hash(h.request.recipient);
    expect((await h.service.evaluate(h.request)).disposition).toBe('SIMULATED');
  });
  it('requires configured runtime authorization', async () => {
    const h = harness();
    delete process.env.DEMO_AUTH_EMAIL_LIVE_RECIPIENT_SHA256_ALLOWLIST;
    expect((await h.service.evaluate(h.request)).disposition).toBe('SIMULATED');
  });
  it.each(['SMS', 'WEBHOOK'])('does not enable channel %s', async (channel) => {
    const h = harness();
    h.request.channel = channel;
    expect((await h.service.evaluate(h.request)).disposition).toBe('SIMULATED');
  });
  it.each([
    'POPULATION_EMAIL',
    'POPULATION_SUBSCRIBER_OTP',
    'UNREGISTERED_OPERATION',
  ])('does not enable %s', async (operation) => {
    const h = harness();
    h.request.operation = operation;
    expect((await h.service.evaluate(h.request)).disposition).toBe('SIMULATED');
  });
  it.each(['organizationId', 'recipientHash', 'purpose', 'status'])(
    'rejects canonical mismatch %s',
    async (key) => {
      const h = harness();
      (h.delivery as any)[key] = 'mismatch';
      expect((await h.service.evaluate(h.request)).disposition).toBe(
        'SIMULATED',
      );
    },
  );
  it('does not release old queued demo notifications', async () => {
    const h = harness();
    h.delivery.createdAt = new Date(Date.now() - 6 * 60_000);
    expect((await h.service.evaluate(h.request)).disposition).toBe('SIMULATED');
  });
  it('requires the active demo client account', async () => {
    const h = harness();
    h.account.isActive = false;
    expect((await h.service.evaluate(h.request)).disposition).toBe('SIMULATED');
  });
  it.each(['organizationId', 'status', 'isActive'])(
    'rejects invalid incident %s',
    async (key) => {
      const h = harness();
      (h.incident as any)[key] = key === 'isActive' ? false : 'mismatch';
      expect((await h.service.evaluate(h.request)).disposition).toBe(
        'SIMULATED',
      );
    },
  );
  it('labels the real operational email as a demo', async () => {
    const h = harness();
    process.env.BREVO_API_KEY = 'synthetic-only';
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 201,
        text: async () => JSON.stringify({ messageId: '<synthetic-only>' }),
      });
    const provider = new PopulationDeliveryService(h.service);
    await provider.sendEmail({
      destination: address,
      subject: 'Exercice fictif',
      html: '<p>Test</p>',
      organizationId: org,
      operation: 'OCCUPANT_ALERT',
      providerIdempotencyKey: 'delivery-a',
    });
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.subject).toBe('[DÉMO CORO] Exercice fictif');
    expect(body.to).toEqual([{ email: address }]);
  });
});
