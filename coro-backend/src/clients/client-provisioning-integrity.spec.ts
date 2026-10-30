import { BadRequestException, ConflictException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientInvitationOutboxService } from './client-invitation-outbox.service';

const actor = { userId: 'admin-a', role: 'ADMIN', organizationId: 'org-a' };
const input = {
  organizationId: 'org-a', name: 'Client QA', contactEmail: 'qa@example.test',
  contactFirstName: 'QA', contactLastName: 'Client',
};

function harness() {
  const state: any = { request: null, clients: [], users: [], events: [] };
  const tx: any = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    clientProvisioningRequest: {
      findUnique: jest.fn(async () => state.request),
      create: jest.fn(async ({ data }: any) => {
        state.request = { ...data, client: state.clients.find((item: any) => item.id === data.clientId) };
        return state.request;
      }),
    },
    clientUser: {
      findUnique: jest.fn(async ({ where }: any) => state.users.find((item: any) => item.email === where.email) || null),
      create: jest.fn(async ({ data }: any) => { const row = { id: 'user-1', ...data }; state.users.push(row); return row; }),
    },
    organization: { findUnique: jest.fn().mockResolvedValue({ name: 'Organisation QA' }) },
    client: { create: jest.fn(async ({ data }: any) => { const row = { id: 'client-1', ...data }; state.clients.push(row); return row; }) },
    clientInvitationEvent: { create: jest.fn(async ({ data }: any) => { state.events.push(data); return data; }) },
  };
  const prisma: any = { $transaction: jest.fn(async (callback: any) => callback(tx)) };
  const outbox = { protect: jest.fn().mockReturnValue({ recipientHash: 'a'.repeat(64), encryptedEnvelope: 'ciphertext', encryptionKeyId: 'qa-v1' }) };
  const service = new ClientsService(prisma, {} as any, {} as any, outbox as any);
  return { state, tx, prisma, outbox, service };
}

describe('Client provisioning integrity', () => {
  it('creates client, portal identity, idempotency record and one invitation intent in one transaction', async () => {
    const h = harness();
    const created = await h.service.create(input, actor, 'client-create-key-0001');
    expect(created.id).toBe('client-1');
    expect(h.state.clients).toHaveLength(1);
    expect(h.state.users).toHaveLength(1);
    expect(h.state.events).toHaveLength(1);
    expect(h.state.request.clientId).toBe('client-1');
    expect(JSON.stringify(h.state.events[0])).not.toContain('qa@example.test');
    expect(JSON.stringify(h.state.events[0])).not.toContain('A1!');
  });

  it('replays the committed result without another write after a lost response', async () => {
    const h = harness();
    const first = await h.service.create(input, actor, 'client-create-key-0002');
    const second = await h.service.create(input, actor, 'client-create-key-0002');
    expect(second.id).toBe(first.id);
    expect(h.tx.client.create).toHaveBeenCalledTimes(1);
    expect(h.tx.clientUser.create).toHaveBeenCalledTimes(1);
    expect(h.tx.clientInvitationEvent.create).toHaveBeenCalledTimes(1);
  });

  it('rejects reuse of the key with an incompatible payload', async () => {
    const h = harness();
    await h.service.create(input, actor, 'client-create-key-0003');
    await expect(h.service.create({ ...input, name: 'Different' }, actor, 'client-create-key-0003'))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects an existing ClientUser without writing a client or event', async () => {
    const h = harness();
    h.state.users.push({ id: 'existing', email: input.contactEmail });
    await expect(h.service.create(input, actor, 'client-create-key-0004')).rejects.toBeInstanceOf(BadRequestException);
    expect(h.tx.client.create).not.toHaveBeenCalled();
    expect(h.tx.clientInvitationEvent.create).not.toHaveBeenCalled();
  });
});

describe('Client invitation outbox worker', () => {
  it('recovers an expired processing lease before dispatching due events', async () => {
    const prisma: any = {
      clientInvitationEvent: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const worker = new ClientInvitationOutboxService(prisma, {} as any);
    await worker.dispatchDue();
    expect(prisma.clientInvitationEvent.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'PROCESSING' }),
      data: expect.objectContaining({ status: 'FAILED', lastErrorCode: 'LEASE_EXPIRED' }),
    }));
  });

  it('retries a provider refusal and then records one delivery', async () => {
    process.env.CLIENT_INVITATION_OUTBOX_KEY_BASE64 = Buffer.alloc(32, 7).toString('base64');
    const rows: any = {};
    const prisma: any = {
      clientInvitationEvent: {
        findUnique: jest.fn(async () => rows.event),
        updateMany: jest.fn(async ({ data }: any) => {
          const normalized = Object.fromEntries(Object.entries(data).map(([key, value]: any) => [key, value?.increment ? (rows.event[key] || 0) + value.increment : value]));
          rows.event = { ...rows.event, ...normalized };
          return { count: 1 };
        }),
        update: jest.fn(async ({ data }: any) => { rows.event = { ...rows.event, ...data }; return rows.event; }),
      },
    };
    const email = { sendClientInvitation: jest.fn().mockResolvedValueOnce({ success: false }).mockResolvedValueOnce({ success: true, messageId: 'fake-1' }) };
    const worker = new ClientInvitationOutboxService(prisma, email as any);
    const protectedPayload = worker.protect({
      toEmail: 'qa@example.test', toName: 'QA', clientName: 'Client',
      temporaryPassword: 'Synthetic-A1!', organizationName: 'Org',
    }, 'event-1');
    rows.event = { id: 'event-1', idempotencyKey: 'event-1', status: 'PENDING', attempts: 0, client: { isActive: true }, clientUser: { isActive: true }, ...protectedPayload };
    await expect(worker.dispatchOne('event-1')).resolves.toMatchObject({ delivered: false });
    rows.event.status = 'FAILED';
    await expect(worker.dispatchOne('event-1')).resolves.toMatchObject({ delivered: true });
    expect(email.sendClientInvitation).toHaveBeenCalledTimes(2);
    expect(rows.event.status).toBe('DELIVERED');
  });

  it('cancels an invitation whose client became inactive without calling the provider', async () => {
    const event = { id: 'event-2', status: 'PENDING', attempts: 0, client: { isActive: false }, clientUser: { isActive: true } };
    const prisma: any = { clientInvitationEvent: { findUnique: jest.fn().mockResolvedValue(event), updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
    const email = { sendClientInvitation: jest.fn() };
    const worker = new ClientInvitationOutboxService(prisma, email as any);
    await expect(worker.dispatchOne(event.id)).resolves.toMatchObject({ cancelled: true });
    expect(email.sendClientInvitation).not.toHaveBeenCalled();
    expect(prisma.clientInvitationEvent.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED' }) }));
  });

  it('fails closed for a malformed key and supports explicit previous-key rotation', async () => {
    process.env.CLIENT_INVITATION_OUTBOX_KEY_ID = 'v1';
    process.env.CLIENT_INVITATION_OUTBOX_KEY_BASE64 = Buffer.alloc(32, 7).toString('base64');
    const worker = new ClientInvitationOutboxService({} as any, {} as any);
    const envelope = { toEmail: 'qa@example.test', toName: 'QA', clientName: 'Client', temporaryPassword: 'Synthetic-A1!', organizationName: 'Org' };
    const protectedV1 = worker.protect(envelope, 'event-3');
    process.env.CLIENT_INVITATION_OUTBOX_KEY_ID = 'v2';
    process.env.CLIENT_INVITATION_OUTBOX_KEY_BASE64 = 'invalid';
    expect(() => worker.protect(envelope, 'event-3')).toThrow('32 bytes');
    process.env.CLIENT_INVITATION_OUTBOX_KEY_BASE64 = Buffer.alloc(32, 8).toString('base64');
    process.env.CLIENT_INVITATION_OUTBOX_PREVIOUS_KEYS_BASE64 = JSON.stringify({ v1: Buffer.alloc(32, 7).toString('base64') });
    expect((worker as any).unprotect(protectedV1.encryptedEnvelope, 'event-3', 'v1')).toEqual(envelope);
    delete process.env.CLIENT_INVITATION_OUTBOX_KEY_ID;
    delete process.env.CLIENT_INVITATION_OUTBOX_PREVIOUS_KEYS_BASE64;
  });
});
