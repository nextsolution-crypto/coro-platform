import { OrganizationUserInvitationOutboxService } from './organization-user-invitation-outbox.service';

describe('OrganizationUserInvitationOutboxService', () => {
  const event = {
    id: 'event-a', organizationId: 'org-a', userId: 'user-a', idempotencyKey: 'request-a',
    recipientHash: 'a'.repeat(64), encryptedEnvelope: '', encryptionKeyId: 'qa-v1',
    status: 'PENDING', attempts: 0, nextAttemptAt: new Date(), leaseExpiresAt: null,
    organization: { isActive: true }, user: { isActive: true, resetTokenExpiry: new Date(Date.now() + 60_000) },
  };

  beforeEach(() => {
    process.env.CLIENT_INVITATION_OUTBOX_KEY_BASE64 = Buffer.alloc(32, 7).toString('base64');
    process.env.CLIENT_INVITATION_OUTBOX_KEY_ID = 'qa-v1';
  });

  it('retries provider failure without mutating the recipient account', async () => {
    const prisma: any = {
      organizationUserInvitationEvent: {
        findUnique: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const email = { sendOrganizationUserInvitation: jest.fn().mockResolvedValue({ success: false }) };
    const service = new OrganizationUserInvitationOutboxService(prisma, email as any);
    const protectedEnvelope = service.protect({ toEmail: 'qa@example.test', toFirstName: 'Q', toLastName: 'A', organizationName: 'QA', activationUrl: 'https://app.getcoro.io/reset-password?token=opaque' }, event.idempotencyKey);
    prisma.organizationUserInvitationEvent.findUnique
      .mockResolvedValueOnce({ ...event, ...protectedEnvelope })
      .mockResolvedValueOnce({ ...event, ...protectedEnvelope });
    const result = await service.dispatchOne(event.id);
    expect(result).toEqual(expect.objectContaining({ claimed: true, delivered: false }));
    expect(email.sendOrganizationUserInvitation).toHaveBeenCalledTimes(1);
    expect(prisma.user).toBeUndefined();
    expect(prisma.organizationUserInvitationEvent.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED', lastErrorCode: 'PROVIDER_REJECTED' }) }));
  });

  it('cancels before provider access when organization or user is inactive', async () => {
    const prisma: any = {
      organizationUserInvitationEvent: {
        findUnique: jest.fn().mockResolvedValue({ ...event, organization: { isActive: false } }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const email = { sendOrganizationUserInvitation: jest.fn() };
    const service = new OrganizationUserInvitationOutboxService(prisma, email as any);
    await expect(service.dispatchOne(event.id)).resolves.toEqual({ claimed: false, cancelled: true });
    expect(email.sendOrganizationUserInvitation).not.toHaveBeenCalled();
  });
});
