import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { ClientAuthService } from './client-auth.service';
import { ClientJwtGuard } from './client-jwt.guard';
import { validateClientPassword } from './client-password-policy';
import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from './email.service';

const user = {
  id: 'client-user-1', email: 'User@Example.test', password: 'old-hash', firstName: 'Marie', lastName: 'Test',
  isActive: true, organizationId: 'org-1', clientId: 'client-1', role: 'CLIENT_MANAGER', sessionVersion: 0,
  buildingIds: [], populationPermissions: [], operationalReviewPermissions: [], correctiveActionPermissions: [],
  client: { name: 'Client' }, organization: { name: 'Org' },
};

function harness(found: any = user) {
  const tx: any = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: user.id }]),
    clientUser: { findUnique: jest.fn().mockResolvedValue({ organizationId: user.organizationId, isActive: true }), update: jest.fn() },
    clientPasswordResetToken: {
      count: jest.fn().mockResolvedValue(0), updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn(), findUnique: jest.fn(),
    },
    clientSecurityAuditEvent: { create: jest.fn() },
    clientTrustedDevice: { deleteMany: jest.fn() }, magicLink: { updateMany: jest.fn() },
  };
  const prisma: any = {
    clientUser: { findMany: jest.fn().mockResolvedValue(found ? [found] : []), findFirst: jest.fn() },
    $transaction: jest.fn((callback: any) => callback(tx)),
  };
  const email: any = { sendClientPasswordReset: jest.fn().mockResolvedValue({ success: true }) };
  const jwt: any = { sign: jest.fn((payload) => payload) };
  return { service: new ClientAuthService(prisma, jwt, email), prisma, tx, email, jwt };
}

describe('Client password reset', () => {
  it('retourne le meme contrat pour connu, inconnu et inactif', async () => {
    const known = harness();
    const unknown = harness(null);
    const inactive = harness({ ...user, isActive: false });
    const response = await known.service.forgotPassword('  USER@example.TEST ');
    expect(await unknown.service.forgotPassword('unknown@example.test')).toEqual(response);
    expect(await inactive.service.forgotPassword('user@example.test')).toEqual(response);
    expect(response).toEqual({ message: expect.any(String) });
    expect(known.prisma.clientUser.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { email: { equals: 'user@example.test', mode: 'insensitive' } } }));
    expect(unknown.tx.clientPasswordResetToken.create).not.toHaveBeenCalled();
    expect(inactive.email.sendClientPasswordReset).not.toHaveBeenCalled();
  });

  it('ne choisit pas arbitrairement un compte si deux emails historiques ne different que par la casse', async () => {
    const h = harness();
    h.prisma.clientUser.findMany.mockResolvedValue([user, { ...user, id: 'client-user-2', email: 'user@example.test' }]);
    await expect(h.service.forgotPassword('user@example.test')).resolves.toEqual({ message: expect.any(String) });
    expect(h.email.sendClientPasswordReset).not.toHaveBeenCalled();
    await expect(h.service.login('user@example.test', 'any')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('persiste uniquement SHA-256, expire a 30 min et envoie le lien client', async () => {
    const h = harness();
    await h.service.forgotPassword(user.email);
    const link = h.email.sendClientPasswordReset.mock.calls[0][0].resetUrl;
    const raw = new URL(link).searchParams.get('token')!;
    const data = h.tx.clientPasswordResetToken.create.mock.calls[0][0].data;
    expect(raw).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(data.tokenHash).toBe(createHash('sha256').update(raw).digest('hex'));
    expect(JSON.stringify(data)).not.toContain(raw);
    expect(data.expiresAt.getTime() - Date.now()).toBeGreaterThan(29 * 60 * 1000);
    expect(data.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(30 * 60 * 1000);
    expect(link).toContain('https://client.getcoro.io/reset-password?token=');
    expect(h.tx.clientSecurityAuditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventType: 'PASSWORD_RESET_REQUESTED' }) });
  });

  it('limite les demandes par compte meme depuis plusieurs IP et garde la reponse neutre si email echoue', async () => {
    const h = harness();
    h.tx.clientPasswordResetToken.count.mockResolvedValue(3);
    await h.service.forgotPassword(user.email);
    expect(h.email.sendClientPasswordReset).not.toHaveBeenCalled();
    h.tx.clientPasswordResetToken.count.mockResolvedValue(0);
    h.email.sendClientPasswordReset.mockRejectedValue(new Error('network'));
    const result = await h.service.forgotPassword(user.email);
    expect(result).toEqual({ message: expect.any(String) });
    h.prisma.$transaction.mockRejectedValue(new Error('db unavailable'));
    expect(await h.service.forgotPassword(user.email)).toEqual(result);
  });

  it('refuse token malforme, inconnu, expire et utilise avec la meme erreur', async () => {
    const h = harness();
    await expect(h.service.resetPassword('bad', 'StrongPass1!')).rejects.toBeInstanceOf(BadRequestException);
    const token = 'a'.repeat(43);
    await expect(h.service.resetPassword(token, 'StrongPass1!')).rejects.toThrow('invalide');
    h.tx.clientPasswordResetToken.findUnique.mockResolvedValue({ id: 'reset-1', clientUserId: user.id });
    h.tx.clientPasswordResetToken.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(h.service.resetPassword(token, 'StrongPass1!')).rejects.toThrow('invalide');
    expect(h.tx.clientUser.update).not.toHaveBeenCalled();
  });

  it('claim atomique, nouveau hash bcrypt, revocation et audit dans la transaction', async () => {
    const h = harness();
    h.tx.clientPasswordResetToken.findUnique.mockResolvedValue({ id: 'reset-1', clientUserId: user.id });
    await expect(h.service.resetPassword('a'.repeat(43), 'StrongPass1!')).resolves.toEqual({ success: true });
    const data = h.tx.clientUser.update.mock.calls[0][0].data;
    expect(await bcrypt.compare('StrongPass1!', data.password)).toBe(true);
    expect(data.sessionVersion).toEqual({ increment: 1 });
    expect(data.mfaCode).toBeNull();
    expect(h.tx.clientTrustedDevice.deleteMany).toHaveBeenCalledWith({ where: { userId: user.id } });
    expect(h.tx.magicLink.updateMany).toHaveBeenCalled();
    expect(h.tx.clientSecurityAuditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventType: 'PASSWORD_RESET_COMPLETED' }) });
  });

  it('change-password et reset partagent la meme politique', async () => {
    for (const password of ['short', 'lowercase1!', 'UPPERCASE1!', 'NoNumber!', 'NoSpecial1']) {
      expect(() => validateClientPassword(password)).toThrow(BadRequestException);
      await expect(harness().service.changePassword(user.id, password)).rejects.toBeInstanceOf(BadRequestException);
      await expect(harness().service.resetPassword('a'.repeat(43), password)).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('guard refuse anciens JWT et accepte la nouvelle version active', async () => {
    const h = harness();
    const guard = new ClientJwtGuard({ verify: jest.fn() } as any, h.prisma);
    const request: any = { headers: { authorization: 'Bearer token' } };
    const context: any = { switchToHttp: () => ({ getRequest: () => request }) };
    const verify = (guard as any).jwt.verify as jest.Mock;
    verify.mockReturnValue({ type: 'CLIENT', sub: user.id, organizationId: user.organizationId, sessionVersion: 0 });
    h.prisma.clientUser.findFirst.mockResolvedValue({ sessionVersion: 1 });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    verify.mockReturnValue({ type: 'CLIENT', sub: user.id, organizationId: user.organizationId, sessionVersion: 1 });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    verify.mockReturnValue({ type: 'CLIENT', sub: user.id, organizationId: user.organizationId });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login et MFA acceptent le courriel avec casse et espaces sans contourner MFA', async () => {
    const h = harness({ ...user, password: await bcrypt.hash('OldPassword1!', 10), mfaCode: '123456', mfaCodeExpiry: new Date(Date.now() + 600000) });
    h.prisma.clientUser.update = jest.fn();
    h.prisma.clientTrustedDevice = { create: jest.fn() };
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    try {
      const first = await h.service.login('  USER@example.TEST ', 'OldPassword1!');
      expect(first).toEqual({ mfaRequired: true, email: user.email });
      expect(h.prisma.clientUser.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { email: { equals: 'user@example.test', mode: 'insensitive' } } }));
      const second = await h.service.verifyMfa(' USER@example.TEST ', '123456');
      expect(second.token).toMatchObject({ sessionVersion: 0, type: 'CLIENT' });
      expect(h.prisma.clientTrustedDevice.create).toHaveBeenCalledTimes(1);
    } finally {
      fetchMock.mockRestore();
    }
  });

  it('Nest resout les dependances runtime du service et du guard', async () => {
    const module = await Test.createTestingModule({
      imports: [PrismaModule, JwtModule.register({ secret: 'test-only-secret' })],
      providers: [ClientAuthService, ClientJwtGuard, EmailService],
    }).compile();
    expect(module.get(ClientAuthService)).toBeInstanceOf(ClientAuthService);
    expect(module.get(ClientJwtGuard)).toBeInstanceOf(ClientJwtGuard);
    await module.close();
  });
});
