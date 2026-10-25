import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { ClientAuthService } from './client-auth.service';

const rawToken = 'a'.repeat(64);
const activeUser = {
  id: 'client-user-1', email: 'qa@example.test', isActive: true,
  organizationId: 'org-a', clientId: 'client-a', role: 'CLIENT_MANAGER',
  sessionVersion: 2, buildingIds: ['building-a'], populationPermissions: [],
  operationalReviewPermissions: [], correctiveActionPermissions: [], client: { name: 'Client A' },
};

function harness() {
  const tx: any = {
    magicLink: {
      findFirst: jest.fn().mockResolvedValue({ id: 'link-1', user: activeUser }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const prisma: any = {
    magicLink: { create: jest.fn() },
    $transaction: jest.fn((callback: any) => callback(tx)),
  };
  const jwt: any = { sign: jest.fn((payload) => payload) };
  return { service: new ClientAuthService(prisma, jwt, {} as any), prisma, tx };
}

describe('Client magic links', () => {
  it('persiste uniquement le SHA-256 du nouveau lien', async () => {
    const h = harness();
    const url = await h.service.generateMagicLink(activeUser.id);
    const token = new URL(url).searchParams.get('token')!;
    const stored = h.prisma.magicLink.create.mock.calls[0][0].data.token;
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(stored).toBe(createHash('sha256').update(token).digest('hex'));
    expect(stored).not.toBe(token);
  });

  it('réclame atomiquement un lien actif et émet une session versionnée', async () => {
    const h = harness();
    const result = await h.service.validateMagicLink(rawToken);
    expect(h.tx.magicLink.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { token: { in: [createHash('sha256').update(rawToken).digest('hex'), rawToken] } },
    }));
    expect(h.tx.magicLink.updateMany).toHaveBeenCalledWith({
      where: { id: 'link-1', usedAt: null, expiresAt: { gt: expect.any(Date) } },
      data: { usedAt: expect.any(Date) },
    });
    expect(result.token).toMatchObject({ sub: activeUser.id, sessionVersion: 2, type: 'CLIENT' });
  });

  it('refuse les jetons malformés, les identités inactives et les rejeux', async () => {
    const malformed = harness();
    await expect(malformed.service.validateMagicLink('bad')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(malformed.prisma.$transaction).not.toHaveBeenCalled();

    const inactive = harness();
    inactive.tx.magicLink.findFirst.mockResolvedValue({ id: 'link-1', user: { ...activeUser, isActive: false } });
    await expect(inactive.service.validateMagicLink(rawToken)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(inactive.tx.magicLink.updateMany).not.toHaveBeenCalled();

    const replay = harness();
    replay.tx.magicLink.updateMany.mockResolvedValue({ count: 0 });
    await expect(replay.service.validateMagicLink(rawToken)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
