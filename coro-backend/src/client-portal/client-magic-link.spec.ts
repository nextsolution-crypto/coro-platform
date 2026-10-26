/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { ClientAuthService } from './client-auth.service';

const rawToken = 'a'.repeat(64);
const activeUser = {
  id: 'client-user-1',
  email: 'qa@example.test',
  isActive: true,
  organizationId: 'org-a',
  clientId: 'client-a',
  role: 'CLIENT_MANAGER',
  sessionVersion: 2,
  buildingIds: ['building-a'],
  populationPermissions: [],
  operationalReviewPermissions: [],
  correctiveActionPermissions: [],
  client: { name: 'Client A' },
};

function harness() {
  const tx: any = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: activeUser.id }]),
    clientUser: {
      findUnique: jest.fn().mockResolvedValue({ isActive: true }),
    },
    magicLink: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 'link-1', user: activeUser }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn(),
    },
  };
  const prisma: any = {
    clientUser: {
      findMany: jest.fn().mockResolvedValue([activeUser]),
      update: jest.fn(),
    },
    magicLink: { create: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn((callback: any) => callback(tx)),
  };
  const email: any = {
    sendClientMagicLink: jest.fn().mockResolvedValue({
      success: true,
      messageId: '<provider-message-id>',
    }),
  };
  const jwt: any = { sign: jest.fn((payload) => payload) };
  const mfaDelivery: any = { send: jest.fn().mockResolvedValue(undefined) };
  return {
    service: new ClientAuthService(prisma, jwt, email, mfaDelivery),
    prisma,
    tx,
    email,
    mfaDelivery,
  };
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
    const expiresAt = h.prisma.magicLink.create.mock.calls[0][0].data.expiresAt;
    expect(expiresAt.getTime() - Date.now()).toBeGreaterThan(14 * 60 * 1000);
    expect(expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(
      15 * 60 * 1000,
    );
  });

  it('demande et envoie un lien en invalidant les precedents sous verrou', async () => {
    const h = harness();
    const response = await h.service.requestMagicLink(' QA@example.test ');
    expect(response).toEqual({ message: expect.any(String) });
    expect(h.tx.$queryRaw).toHaveBeenCalled();
    expect(h.tx.magicLink.updateMany).toHaveBeenCalledWith({
      where: { userId: activeUser.id, usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
    const data = h.tx.magicLink.create.mock.calls[0][0].data;
    expect(data.token).toMatch(/^[a-f0-9]{64}$/);
    expect(data.expiresAt.getTime() - Date.now()).toBeGreaterThan(
      14 * 60 * 1000,
    );
    expect(data.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(
      15 * 60 * 1000,
    );
    const sent = h.email.sendClientMagicLink.mock.calls[0][0];
    const raw = new URL(sent.magicUrl).searchParams.get('token')!;
    expect(data.token).toBe(createHash('sha256').update(raw).digest('hex'));
    expect(JSON.stringify(data)).not.toContain(raw);
  });

  it('garde une reponse neutre et revoque le lien si le fournisseur refuse', async () => {
    const h = harness();
    h.email.sendClientMagicLink.mockResolvedValue({ success: false });
    await expect(h.service.requestMagicLink(activeUser.email)).resolves.toEqual(
      {
        message: expect.any(String),
      },
    );
    const tokenHash = h.tx.magicLink.create.mock.calls[0][0].data.token;
    expect(h.prisma.magicLink.updateMany).toHaveBeenCalledWith({
      where: { token: tokenHash, userId: activeUser.id, usedAt: null },
      data: { usedAt: expect.any(Date) },
    });

    const unknown = harness();
    unknown.prisma.clientUser.findMany.mockResolvedValue([]);
    const neutral = await unknown.service.requestMagicLink(
      'unknown@example.test',
    );
    expect(neutral).toEqual({ message: expect.any(String) });
    expect(unknown.email.sendClientMagicLink).not.toHaveBeenCalled();
  });

  it('réclame atomiquement un lien actif et émet une session versionnée', async () => {
    const h = harness();
    const result = await h.service.validateMagicLink(rawToken);
    expect(h.tx.magicLink.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          token: {
            in: [createHash('sha256').update(rawToken).digest('hex'), rawToken],
          },
        },
      }),
    );
    expect(h.tx.magicLink.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'link-1',
        usedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      data: { usedAt: expect.any(Date) },
    });
    expect(result).toEqual({ mfaRequired: true, email: activeUser.email });
    expect(h.prisma.clientUser.update).toHaveBeenCalledWith({
      where: { id: activeUser.id },
      data: {
        mfaCode: expect.stringMatching(/^\d{6}$/),
        mfaCodeExpiry: expect.any(Date),
      },
    });
    expect(h.mfaDelivery.send).toHaveBeenCalledTimes(1);
  });

  it('refuse les jetons malformés, les identités inactives et les rejeux', async () => {
    const malformed = harness();
    await expect(
      malformed.service.validateMagicLink('bad'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(malformed.prisma.$transaction).not.toHaveBeenCalled();

    const inactive = harness();
    inactive.tx.magicLink.findFirst.mockResolvedValue({
      id: 'link-1',
      user: { ...activeUser, isActive: false },
    });
    await expect(
      inactive.service.validateMagicLink(rawToken),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(inactive.tx.magicLink.updateMany).not.toHaveBeenCalled();

    const replay = harness();
    replay.tx.magicLink.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      replay.service.validateMagicLink(rawToken),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
