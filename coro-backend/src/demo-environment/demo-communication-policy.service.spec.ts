import {
  DemoCommunicationChannel,
  DemoCommunicationMode,
  PopulationAlertChannel,
  PopulationAlertStatus,
  PopulationAlertType,
  PopulationDeliveryMode,
  PopulationDeliveryStatus,
  PopulationGovernanceMode,
  PopulationProgramStatus,
} from '@prisma/client';
import { createHash } from 'crypto';
import { DemoCommunicationPolicyService } from './demo-communication-policy.service';

function harness(environment: any) {
  const events = new Map<string, any>();
  const prisma = {
    user: { findUnique: jest.fn() },
    clientUser: { findUnique: jest.fn() },
    demoEnvironment: {
      findUnique: jest.fn().mockResolvedValue(environment),
    },
    demoCommunicationEvent: {
      upsert: jest.fn(async ({ where, create }: any) => {
        const key = `${where.organizationId_idempotencyKey.organizationId}:${where.organizationId_idempotencyKey.idempotencyKey}`;
        if (!events.has(key))
          events.set(key, { id: `event-${events.size + 1}`, ...create });
        return { id: events.get(key).id };
      }),
    },
    populationAlertDelivery: { findUnique: jest.fn() },
  };
  return {
    prisma,
    service: new DemoCommunicationPolicyService(prisma as any),
    events,
  };
}

describe('DemoCommunicationPolicyService', () => {
  const demoOrganizationId = '916f54ec-af22-45e0-99db-a369d9630002';
  const recipient = 'demo-authorized@example.test';
  const previousAllowlist =
    process.env.DEMO_AUTH_EMAIL_LIVE_RECIPIENT_SHA256_ALLOWLIST;

  beforeEach(() => {
    process.env.POPULATION_CONTROLLED_LIVE_TEST_MAX_CAMPAIGN_CAD_CENTS = '100';
    process.env.POPULATION_CONTROLLED_LIVE_TEST_ALERT_ID = 'alert-approved';
    process.env.POPULATION_CONTROLLED_LIVE_TEST_EXPIRES_AT = new Date(
      Date.now() + 1800000,
    ).toISOString();
    process.env.POPULATION_CONTROLLED_LIVE_TEST_SMS_CANADA_CAD_MICROS_PER_SEGMENT =
      '75000';
    process.env.POPULATION_CONTROLLED_LIVE_TEST_EMAIL_CAD_MICROS_PER_MESSAGE =
      '1000';
  });

  afterEach(() => {
    if (previousAllowlist === undefined)
      delete process.env.DEMO_AUTH_EMAIL_LIVE_RECIPIENT_SHA256_ALLOWLIST;
    else
      process.env.DEMO_AUTH_EMAIL_LIVE_RECIPIENT_SHA256_ALLOWLIST =
        previousAllowlist;
    delete process.env.POPULATION_CONTROLLED_LIVE_TEST_ALERT_ID;
    delete process.env.POPULATION_CONTROLLED_LIVE_TEST_EXPIRES_AT;
    delete process.env.POPULATION_CONTROLLED_LIVE_TEST_ENABLED;
    delete process.env.POPULATION_CONTROLLED_LIVE_TEST_STOP;
    delete process.env.POPULATION_CONTROLLED_LIVE_TEST_ORGANIZATION_ID;
    delete process.env.POPULATION_CONTROLLED_LIVE_TEST_PROGRAM_ID;
    delete process.env.POPULATION_CONTROLLED_LIVE_TEST_EMAIL_SHA256;
    delete process.env.POPULATION_CONTROLLED_LIVE_TEST_SMS_SHA256;
    delete process.env.POPULATION_CONTROLLED_LIVE_TEST_MAX_CAMPAIGN_CAD_CENTS;
    delete process.env
      .POPULATION_CONTROLLED_LIVE_TEST_SMS_CANADA_CAD_MICROS_PER_SEGMENT;
    delete process.env
      .POPULATION_CONTROLLED_LIVE_TEST_EMAIL_CAD_MICROS_PER_MESSAGE;
  });

  it('laisse les tenants ordinaires utiliser leur transport existant', async () => {
    const h = harness(null);
    await expect(
      h.service.evaluate({
        organizationId: 'org-live',
        channel: DemoCommunicationChannel.EMAIL,
        operation: 'MFA',
        recipient: 'person@example.test',
        payload: { subject: 'Code' },
      }),
    ).resolves.toEqual({ disposition: 'LIVE' });
    expect(h.prisma.demoCommunicationEvent.upsert).not.toHaveBeenCalled();
  });

  it('simule sans conserver le destinataire ni le contenu', async () => {
    const h = harness({
      status: 'ACTIVE',
      communicationMode: DemoCommunicationMode.SIMULATE,
      externalProvidersDisabled: true,
    });
    const decision = await h.service.evaluate({
      organizationId: 'org-demo',
      channel: DemoCommunicationChannel.EMAIL,
      operation: 'CLIENT_INVITATION',
      recipient: 'demo-user@example.invalid',
      payload: { subject: 'Invitation', secret: 'not-persisted' },
      idempotencyKey: 'fixture:invitation:1',
    });
    expect(decision.disposition).toBe('SIMULATED');
    expect(h.events.size).toBe(1);
    const stored = [...h.events.values()][0];
    expect(JSON.stringify(stored)).not.toContain('demo-user@example.invalid');
    expect(JSON.stringify(stored)).not.toContain('not-persisted');
    expect(stored.recipientHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.payloadHash).toMatch(/^[a-f0-9]{64}$/);
  });

  function allowRecipient() {
    process.env.DEMO_AUTH_EMAIL_LIVE_RECIPIENT_SHA256_ALLOWLIST = createHash(
      'sha256',
    )
      .update(recipient)
      .digest('hex');
  }

  function eligibleHarness(kind: 'user' | 'clientUser') {
    const h = harness({
      status: 'ACTIVE',
      communicationMode: DemoCommunicationMode.SIMULATE,
      externalProvidersDisabled: true,
    });
    h.prisma.user.findUnique.mockResolvedValue(
      kind === 'user'
        ? { organizationId: demoOrganizationId, isActive: true }
        : null,
    );
    h.prisma.clientUser.findUnique.mockResolvedValue(
      kind === 'clientUser'
        ? {
            organizationId: demoOrganizationId,
            isActive: true,
            client: { isActive: true },
          }
        : null,
    );
    return h;
  }

  it.each([
    ['PLATFORM_MFA', 'user'],
    ['PLATFORM_PASSWORD_RESET', 'user'],
    ['ORGANIZATION_USER_INVITATION', 'user'],
    ['CLIENT_PASSWORD_RESET', 'clientUser'],
    ['CLIENT_MAGIC_LINK', 'clientUser'],
    ['CLIENT_INVITATION', 'clientUser'],
  ] as const)(
    'autorise %s seulement pour une identite %s active du tenant canonique',
    async (operation, kind) => {
      allowRecipient();
      const h = eligibleHarness(kind);
      await expect(
        h.service.evaluate({
          organizationId: demoOrganizationId,
          channel: DemoCommunicationChannel.EMAIL,
          operation,
          recipient,
          payload: { template: operation },
        }),
      ).resolves.toEqual({ disposition: 'LIVE' });
      const stored = [...h.events.values()][0];
      expect(stored).toMatchObject({ simulated: false, blocked: false });
    },
  );

  it('autorise PLATFORM_MFA pour un seul type d identite admissible', async () => {
    allowRecipient();
    const h = eligibleHarness('clientUser');
    await expect(
      h.service.evaluate({
        organizationId: demoOrganizationId,
        channel: DemoCommunicationChannel.EMAIL,
        operation: 'PLATFORM_MFA',
        recipient,
        payload: { template: 'PLATFORM_MFA' },
      }),
    ).resolves.toEqual({ disposition: 'LIVE' });
    const stored = [...h.events.values()][0];
    expect(stored).toMatchObject({ simulated: false, blocked: false });
  });

  it.each([
    [
      'destinataire absent',
      'other@example.test',
      'PLATFORM_MFA',
      DemoCommunicationChannel.EMAIL,
    ],
    [
      'operation metier',
      'demo-authorized@example.test',
      'POPULATION_ALERT',
      DemoCommunicationChannel.EMAIL,
    ],
    [
      'canal SMS',
      'demo-authorized@example.test',
      'PLATFORM_MFA',
      DemoCommunicationChannel.SMS,
    ],
  ])(
    'maintient la simulation pour %s',
    async (_label, recipient, operation, channel) => {
      allowRecipient();
      const h = eligibleHarness('user');
      await expect(
        h.service.evaluate({
          organizationId: demoOrganizationId,
          channel,
          operation,
          recipient,
          payload: {},
        }),
      ).resolves.toEqual({ disposition: 'SIMULATED', eventId: 'event-1' });
    },
  );

  it.each([
    ['mauvais tenant', 'other-organization', true, false],
    ['identite inactive', demoOrganizationId, false, false],
    ['identites ambigues', demoOrganizationId, true, true],
  ])(
    'maintient la simulation pour %s',
    async (_label, organizationId, userActive, clientActive) => {
      allowRecipient();
      const h = harness({
        status: 'ACTIVE',
        communicationMode: DemoCommunicationMode.SIMULATE,
        externalProvidersDisabled: true,
      });
      h.prisma.user.findUnique.mockResolvedValue({
        organizationId: demoOrganizationId,
        isActive: userActive,
      });
      h.prisma.clientUser.findUnique.mockResolvedValue(
        clientActive
          ? {
              organizationId: demoOrganizationId,
              isActive: true,
              client: { isActive: true },
            }
          : null,
      );
      await expect(
        h.service.evaluate({
          organizationId,
          channel: DemoCommunicationChannel.EMAIL,
          operation: 'PLATFORM_MFA',
          recipient,
          payload: {},
        }),
      ).resolves.toEqual({ disposition: 'SIMULATED', eventId: 'event-1' });
    },
  );

  it('ne contourne jamais BLOCK avec l allowlist authentification', async () => {
    allowRecipient();
    const h = harness({
      status: 'PAUSED',
      communicationMode: DemoCommunicationMode.BLOCK,
      externalProvidersDisabled: true,
    });
    const decision = await h.service.evaluate({
      organizationId: demoOrganizationId,
      channel: DemoCommunicationChannel.EMAIL,
      operation: 'PLATFORM_MFA',
      recipient,
      payload: {},
    });
    expect(decision.disposition).toBe('BLOCKED');
  });

  it('autorise seulement la destination hachée du test Population contrôlé', async () => {
    process.env.POPULATION_CONTROLLED_LIVE_TEST_ENABLED = 'true';
    process.env.POPULATION_CONTROLLED_LIVE_TEST_STOP = 'false';
    process.env.POPULATION_CONTROLLED_LIVE_TEST_ORGANIZATION_ID =
      demoOrganizationId;
    process.env.POPULATION_CONTROLLED_LIVE_TEST_PROGRAM_ID = 'program-approved';
    process.env.POPULATION_CONTROLLED_LIVE_TEST_EMAIL_SHA256 = createHash(
      'sha256',
    )
      .update(recipient)
      .digest('hex');
    const h = harness({
      status: 'ACTIVE',
      communicationMode: DemoCommunicationMode.SIMULATE,
      externalProvidersDisabled: true,
    });
    h.prisma.populationAlertDelivery.findUnique.mockResolvedValue({
      alertId: 'alert-approved',
      idempotencyKey: 'delivery-idempotency',
      providerIdempotencyKey: 'provider-idempotency',
      channel: PopulationAlertChannel.EMAIL,
      status: PopulationDeliveryStatus.SENDING,
      suppressionReason: null,
      destinationSnapshot: recipient,
      alert: {
        id: 'alert-approved',
        programId: 'program-approved',
        type: PopulationAlertType.TEST,
        status: PopulationAlertStatus.SENDING,
        titleFR: 'EXERCICE / TEST - Ammoniac',
        titleEN: 'EXERCISE / TEST - Ammonia',
        deliveryModeSnapshot: PopulationDeliveryMode.LIVE,
        createdByType: 'USER',
        createdById: 'creator',
        approvedByType: 'USER',
        approvedById: 'approver',
        program: {
          id: 'program-approved',
          status: PopulationProgramStatus.ACTIVE,
          governanceMode: PopulationGovernanceMode.DUAL_CONTROL,
          rueFacilityProfile: {
            building: { organizationId: demoOrganizationId },
          },
        },
        deliveries: [
          {
            channel: PopulationAlertChannel.EMAIL,
            subscriberId: 'subscriber-only',
            destinationSnapshot: recipient,
            messageSnapshot: 'EXERCICE / TEST CORO - AUCUNE URGENCE REELLE',
          },
          {
            channel: PopulationAlertChannel.SMS,
            subscriberId: 'subscriber-only',
            destinationSnapshot: '+15145550101',
            messageSnapshot: 'EXERCICE / TEST CORO - AUCUNE URGENCE REELLE',
          },
        ],
      },
    });
    await expect(
      h.service.evaluate({
        organizationId: demoOrganizationId,
        channel: DemoCommunicationChannel.EMAIL,
        operation: 'POPULATION_CONTROLLED_LIVE_TEST',
        recipient,
        payload: { subject: 'EXERCICE / TEST' },
        idempotencyKey: 'provider-idempotency',
        controlledPopulationContext: {
          programId: 'program-approved',
          alertId: 'alert-approved',
          deliveryId: 'delivery-approved',
        },
      }),
    ).resolves.toEqual({ disposition: 'LIVE' });

    await expect(
      h.service.evaluate({
        organizationId: demoOrganizationId,
        channel: DemoCommunicationChannel.EMAIL,
        operation: 'POPULATION_CONTROLLED_LIVE_TEST',
        recipient,
        payload: { subject: 'EXERCICE / TEST' },
        idempotencyKey: 'forged-idempotency',
        controlledPopulationContext: {
          programId: 'program-approved',
          alertId: 'alert-approved',
          deliveryId: 'delivery-approved',
        },
      }),
    ).resolves.toEqual({ disposition: 'BLOCKED', eventId: 'event-2' });
    await expect(
      h.service.evaluate({
        organizationId: demoOrganizationId,
        channel: DemoCommunicationChannel.EMAIL,
        operation: 'POPULATION_CONTROLLED_LIVE_TEST',
        recipient,
        payload: { subject: 'EXERCICE / TEST' },
        idempotencyKey: 'other-program-attempt',
        controlledPopulationContext: {
          programId: 'other-program',
          alertId: 'alert-approved',
          deliveryId: 'delivery-approved',
        },
      }),
    ).resolves.toEqual({ disposition: 'BLOCKED', eventId: 'event-3' });
    const context = {
      programId: 'program-approved',
      alertId: 'alert-approved',
      deliveryId: 'delivery-approved',
    };
    for (const key of ['delivery-idempotency', 'other-provider-key', '']) {
      const refused = await h.service.evaluate({
        organizationId: demoOrganizationId,
        channel: DemoCommunicationChannel.EMAIL,
        operation: 'POPULATION_CONTROLLED_LIVE_TEST',
        recipient,
        payload: {},
        idempotencyKey: key,
        controlledPopulationContext: context,
      });
      expect(refused.disposition).toBe('BLOCKED');
    }
    const canonical =
      h.prisma.populationAlertDelivery.findUnique.mock.results[0].value;
    const emailDelivery = await canonical;
    h.prisma.populationAlertDelivery.findUnique.mockResolvedValue({
      ...emailDelivery,
      providerIdempotencyKey: null,
    });
    expect(
      (
        await h.service.evaluate({
          organizationId: demoOrganizationId,
          channel: DemoCommunicationChannel.EMAIL,
          operation: 'POPULATION_CONTROLLED_LIVE_TEST',
          recipient,
          payload: {},
          idempotencyKey: 'delivery-idempotency',
          controlledPopulationContext: context,
        })
      ).disposition,
    ).toBe('BLOCKED');
    const smsRecipient = '+15145550101';
    process.env.POPULATION_CONTROLLED_LIVE_TEST_SMS_SHA256 = createHash(
      'sha256',
    )
      .update(smsRecipient)
      .digest('hex');
    h.prisma.populationAlertDelivery.findUnique.mockResolvedValue({
      ...emailDelivery,
      channel: PopulationAlertChannel.SMS,
      destinationSnapshot: smsRecipient,
    });
    for (const [key, disposition] of [
      ['delivery-idempotency', 'LIVE'],
      ['provider-idempotency', 'BLOCKED'],
      ['other-key', 'BLOCKED'],
      ['', 'BLOCKED'],
    ]) {
      expect(
        (
          await h.service.evaluate({
            organizationId: demoOrganizationId,
            channel: DemoCommunicationChannel.SMS,
            operation: 'POPULATION_CONTROLLED_LIVE_TEST',
            recipient: smsRecipient,
            payload: {},
            idempotencyKey: key,
            controlledPopulationContext: context,
          })
        ).disposition,
      ).toBe(disposition);
    }
    expect(
      (
        await h.service.evaluate({
          organizationId: demoOrganizationId,
          channel: DemoCommunicationChannel.EMAIL,
          operation: 'POPULATION_CONTROLLED_LIVE_TEST',
          recipient,
          payload: {},
          idempotencyKey: 'provider-idempotency',
          controlledPopulationContext: context,
        })
      ).disposition,
    ).toBe('BLOCKED');
    h.prisma.populationAlertDelivery.findUnique.mockResolvedValue(
      emailDelivery,
    );
  });

  it('ne transforme jamais le nom d operation usurpe en autorisation LIVE', async () => {
    process.env.POPULATION_CONTROLLED_LIVE_TEST_ENABLED = 'true';
    process.env.POPULATION_CONTROLLED_LIVE_TEST_STOP = 'false';
    process.env.POPULATION_CONTROLLED_LIVE_TEST_ORGANIZATION_ID =
      demoOrganizationId;
    process.env.POPULATION_CONTROLLED_LIVE_TEST_PROGRAM_ID = 'program-approved';
    process.env.POPULATION_CONTROLLED_LIVE_TEST_EMAIL_SHA256 = createHash(
      'sha256',
    )
      .update(recipient)
      .digest('hex');
    const h = harness({
      status: 'ACTIVE',
      communicationMode: DemoCommunicationMode.SIMULATE,
      externalProvidersDisabled: true,
    });
    await expect(
      h.service.evaluate({
        organizationId: demoOrganizationId,
        channel: DemoCommunicationChannel.EMAIL,
        operation: 'POPULATION_CONTROLLED_LIVE_TEST',
        recipient,
        payload: { subject: 'EXERCICE / TEST' },
        idempotencyKey: 'spoofed-operation-name',
      }),
    ).resolves.toEqual({ disposition: 'BLOCKED', eventId: 'event-1' });
    expect(h.prisma.populationAlertDelivery.findUnique).not.toHaveBeenCalled();
  });

  it('refuse une campagne canonique qui change juste avant le transport', async () => {
    process.env.POPULATION_CONTROLLED_LIVE_TEST_ENABLED = 'true';
    process.env.POPULATION_CONTROLLED_LIVE_TEST_STOP = 'false';
    process.env.POPULATION_CONTROLLED_LIVE_TEST_ORGANIZATION_ID =
      demoOrganizationId;
    process.env.POPULATION_CONTROLLED_LIVE_TEST_PROGRAM_ID = 'program-approved';
    process.env.POPULATION_CONTROLLED_LIVE_TEST_EMAIL_SHA256 = createHash(
      'sha256',
    )
      .update(recipient)
      .digest('hex');
    const h = harness({
      status: 'ACTIVE',
      communicationMode: DemoCommunicationMode.SIMULATE,
      externalProvidersDisabled: true,
    });
    h.prisma.populationAlertDelivery.findUnique.mockResolvedValue({
      alertId: 'alert-approved',
      idempotencyKey: 'delivery-idempotency',
      providerIdempotencyKey: 'provider-idempotency',
      channel: PopulationAlertChannel.EMAIL,
      status: PopulationDeliveryStatus.SENT,
      suppressionReason: null,
      destinationSnapshot: recipient,
      alert: {
        id: 'alert-approved',
        programId: 'program-approved',
        type: PopulationAlertType.TEST,
        status: PopulationAlertStatus.SENDING,
        titleFR: 'EXERCICE / TEST',
        titleEN: 'EXERCISE / TEST',
        deliveryModeSnapshot: PopulationDeliveryMode.LIVE,
        createdByType: 'USER',
        createdById: 'creator',
        approvedByType: 'USER',
        approvedById: 'approver',
        program: {
          id: 'program-approved',
          status: PopulationProgramStatus.ACTIVE,
          governanceMode: PopulationGovernanceMode.DUAL_CONTROL,
          rueFacilityProfile: {
            building: { organizationId: demoOrganizationId },
          },
        },
        deliveries: [
          {
            channel: PopulationAlertChannel.EMAIL,
            subscriberId: 'subscriber-only',
            destinationSnapshot: recipient,
            messageSnapshot: 'EXERCICE / TEST CORO - AUCUNE URGENCE REELLE',
          },
          {
            channel: PopulationAlertChannel.SMS,
            subscriberId: 'subscriber-only',
            destinationSnapshot: '+15145550101',
            messageSnapshot: 'EXERCICE / TEST CORO - AUCUNE URGENCE REELLE',
          },
        ],
      },
    });
    await expect(
      h.service.evaluate({
        organizationId: demoOrganizationId,
        channel: DemoCommunicationChannel.EMAIL,
        operation: 'POPULATION_CONTROLLED_LIVE_TEST',
        recipient,
        payload: { subject: 'EXERCICE / TEST' },
        idempotencyKey: 'provider-idempotency',
        controlledPopulationContext: {
          programId: 'program-approved',
          alertId: 'alert-approved',
          deliveryId: 'delivery-approved',
        },
      }),
    ).resolves.toEqual({ disposition: 'BLOCKED', eventId: 'event-1' });
  });

  it('maintient PAUSED/BLOCK prioritaire au test Population contrôlé', async () => {
    process.env.POPULATION_CONTROLLED_LIVE_TEST_ENABLED = 'true';
    process.env.POPULATION_CONTROLLED_LIVE_TEST_ORGANIZATION_ID =
      demoOrganizationId;
    process.env.POPULATION_CONTROLLED_LIVE_TEST_EMAIL_SHA256 = createHash(
      'sha256',
    )
      .update(recipient)
      .digest('hex');
    const h = harness({
      status: 'PAUSED',
      communicationMode: DemoCommunicationMode.BLOCK,
      externalProvidersDisabled: true,
    });
    const decision = await h.service.evaluate({
      organizationId: demoOrganizationId,
      channel: DemoCommunicationChannel.EMAIL,
      operation: 'POPULATION_CONTROLLED_LIVE_TEST',
      recipient,
      payload: {},
    });
    expect(decision.disposition).toBe('BLOCKED');
  });

  it('bloque un environnement en pause et reste idempotent', async () => {
    const h = harness({
      status: 'PAUSED',
      communicationMode: DemoCommunicationMode.SIMULATE,
      externalProvidersDisabled: true,
    });
    const request = {
      organizationId: 'org-demo',
      channel: DemoCommunicationChannel.SMS,
      operation: 'POPULATION_ALERT',
      recipient: '+15555550100',
      payload: { message: 'Simulation' },
      idempotencyKey: 'fixture:alert:1',
    } as const;
    const first = await h.service.evaluate(request);
    const second = await h.service.evaluate(request);
    expect(first).toEqual(second);
    expect(first.disposition).toBe('BLOCKED');
    expect(h.events.size).toBe(1);
  });

  it('refuse une configuration Démo qui autoriserait un fournisseur externe', async () => {
    const h = harness({
      status: 'ACTIVE',
      communicationMode: DemoCommunicationMode.SIMULATE,
      externalProvidersDisabled: false,
    });
    await expect(
      h.service.evaluate({
        organizationId: 'org-demo',
        channel: DemoCommunicationChannel.WEBHOOK,
        operation: 'CALLBACK',
        payload: {},
      }),
    ).rejects.toThrow('DEMO_EXTERNAL_PROVIDER_POLICY_INVALID');
  });

  it('résout un destinataire seulement si User et ClientUser ne divergent pas', async () => {
    const h = harness(null);
    h.prisma.user.findUnique.mockResolvedValue({ organizationId: 'org-demo' });
    h.prisma.clientUser.findUnique.mockResolvedValue({
      organizationId: 'org-demo',
    });
    await expect(
      h.service.organizationIdForRecipient(' Demo@Example.Invalid '),
    ).resolves.toBe('org-demo');
    h.prisma.clientUser.findUnique.mockResolvedValue({
      organizationId: 'org-other',
    });
    await expect(
      h.service.organizationIdForRecipient('demo@example.invalid'),
    ).resolves.toBeNull();
  });
});
