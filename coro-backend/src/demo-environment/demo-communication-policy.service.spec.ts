import {
  DemoCommunicationChannel,
  DemoCommunicationMode,
} from '@prisma/client';
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
        if (!events.has(key)) events.set(key, { id: `event-${events.size + 1}`, ...create });
        return { id: events.get(key).id };
      }),
    },
  };
  return {
    prisma,
    service: new DemoCommunicationPolicyService(prisma as any),
    events,
  };
}

describe('DemoCommunicationPolicyService', () => {
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
    h.prisma.clientUser.findUnique.mockResolvedValue({ organizationId: 'org-demo' });
    await expect(
      h.service.organizationIdForRecipient(' Demo@Example.Invalid '),
    ).resolves.toBe('org-demo');
    h.prisma.clientUser.findUnique.mockResolvedValue({ organizationId: 'org-other' });
    await expect(
      h.service.organizationIdForRecipient('demo@example.invalid'),
    ).resolves.toBeNull();
  });
});
