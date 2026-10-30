import { ClientsService } from './clients.service';

const actor = { userId: 'admin-a', role: 'ADMIN', organizationId: 'org-a' };

function harness() {
  const state: any = {
    client: { id: 'client-a', name: 'Client A', organizationId: 'org-a', isActive: true, clientUsers: [{ id: 'portal-active' }, { id: 'portal-disabled' }] },
  };
  const tx: any = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'client-a' }]),
    client: {
      findFirst: jest.fn(async () => state.client),
      update: jest.fn(async ({ data }: any) => { state.client = { ...state.client, ...data }; return state.client; }),
    },
    clientUser: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    clientTrustedDevice: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    magicLink: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    clientPasswordResetToken: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    clientInvitationEvent: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  const prisma: any = { $transaction: jest.fn(async (callback: any) => callback(tx)) };
  const audit: any = { record: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
  const service = new ClientsService(prisma, {} as any, audit, {} as any);
  return { state, tx, prisma, audit, service };
}

describe('Client inherited suspension policy', () => {
  it('atomically revokes sessions, challenges, devices, links and pending invitations without changing individual activation', async () => {
    const h = harness();
    await h.service.remove('client-a', 'org-a', actor);
    expect(h.tx.client.update).toHaveBeenCalledWith({ where: { id: 'client-a' }, data: { isActive: false } });
    expect(h.tx.clientUser.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['portal-active', 'portal-disabled'] } },
      data: { sessionVersion: { increment: 1 }, mfaCode: null, mfaCodeExpiry: null },
    });
    expect(h.tx.clientTrustedDevice.deleteMany).toHaveBeenCalled();
    expect(h.tx.magicLink.updateMany).toHaveBeenCalled();
    expect(h.tx.clientPasswordResetToken.updateMany).toHaveBeenCalled();
    expect(h.tx.clientInvitationEvent.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED' }) }));
    expect(h.audit.record).toHaveBeenCalledWith(h.tx, expect.objectContaining({ action: 'CLIENT_DEACTIVATED', actorUserId: actor.userId }));
    expect(h.tx.clientUser.updateMany.mock.calls[0][0].data).not.toHaveProperty('isActive');
  });

  it('is idempotent under repeated deactivation and does not duplicate revocation or audit effects', async () => {
    const h = harness();
    await h.service.remove('client-a', 'org-a', actor);
    await h.service.remove('client-a', 'org-a', actor);
    expect(h.tx.clientUser.updateMany).toHaveBeenCalledTimes(1);
    expect(h.tx.clientInvitationEvent.updateMany).toHaveBeenCalledTimes(1);
    expect(h.audit.record).toHaveBeenCalledTimes(1);
  });

  it('reactivates only the Client and never restores prior sessions, links or individually disabled accounts', async () => {
    const h = harness();
    h.state.client.isActive = false;
    await h.service.reactivate('client-a', 'org-a', actor);
    expect(h.tx.client.update).toHaveBeenCalledWith({ where: { id: 'client-a' }, data: { isActive: true } });
    expect(h.tx.clientUser.updateMany).not.toHaveBeenCalled();
    expect(h.tx.magicLink.updateMany).not.toHaveBeenCalled();
    expect(h.audit.record).toHaveBeenCalledWith(h.tx, expect.objectContaining({ action: 'CLIENT_REACTIVATED' }));
  });
});
