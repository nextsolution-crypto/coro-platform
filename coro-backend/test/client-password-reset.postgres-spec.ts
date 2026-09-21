import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { randomUUID, randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { ClientAuthService } from '../src/client-portal/client-auth.service';
import { ClientJwtGuard } from '../src/client-portal/client-jwt.guard';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error('TEST_DATABASE_URL est obligatoire pour client-password-reset.postgres-spec');

describe('Client password reset PostgreSQL', () => {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const suffix = randomUUID();
  const ids = { org: `reset-org-${suffix}`, client: `reset-client-${suffix}`, user: `reset-user-${suffix}` };
  const email = { sendClientPasswordReset: jest.fn().mockResolvedValue({ success: true }) };
  const jwt = new JwtService({ secret: 'test-only-secret', signOptions: { expiresIn: '7d' } });
  const service = new ClientAuthService(prisma as any, jwt, email as any);

  const requestToken = async () => {
    await service.forgotPassword(`  RESET-${suffix}@EXAMPLE.INVALID  `);
    const url = email.sendClientPasswordReset.mock.lastCall?.[0]?.resetUrl;
    return new URL(url).searchParams.get('token')!;
  };

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.create({ data: { id: ids.org, name: 'Reset test' } });
    await prisma.client.create({ data: { id: ids.client, organizationId: ids.org, name: 'Reset test', regulatoryRequirements: [] } });
    await prisma.clientUser.create({ data: {
      id: ids.user, email: `Reset-${suffix}@example.invalid`, password: await bcrypt.hash('OldPassword1!', 10),
      firstName: 'Test', lastName: 'User', organizationId: ids.org, clientId: ids.client, buildingIds: [],
    } });
  });
  afterAll(async () => prisma.$disconnect());

  it('applique FK et unicite du hash', async () => {
    const hash = createHash('sha256').update(suffix).digest('hex');
    await expect(prisma.clientPasswordResetToken.create({ data: { clientUserId: randomUUID(), tokenHash: hash, expiresAt: new Date(Date.now() + 1000) } })).rejects.toThrow();
    await prisma.clientPasswordResetToken.create({ data: { clientUserId: ids.user, tokenHash: hash, expiresAt: new Date(Date.now() + 1000) } });
    await expect(prisma.clientPasswordResetToken.create({ data: { clientUserId: ids.user, tokenHash: hash, expiresAt: new Date(Date.now() + 1000) } })).rejects.toThrow();
    await expect(prisma.clientPasswordResetToken.create({ data: { clientUserId: ids.user, tokenHash: 'not-sha256', expiresAt: new Date(Date.now() + 1000) } })).rejects.toThrow();
  });

  it('deux demandes invalident la premiere et une seule reste active', async () => {
    const first = await requestToken();
    const second = await requestToken();
    expect(first).not.toBe(second);
    const firstHash = createHash('sha256').update(first).digest('hex');
    const firstRecord = await prisma.clientPasswordResetToken.findUniqueOrThrow({ where: { tokenHash: firstHash } });
    expect(firstRecord.usedAt).not.toBeNull();
    await expect(service.resetPassword(first, 'NewPassword1!')).rejects.toThrow('invalide');
    const active = await prisma.clientPasswordResetToken.count({ where: { clientUserId: ids.user, usedAt: null, expiresAt: { gt: new Date() } } });
    expect(active).toBe(1);
  });

  it('deux forgot simultanes laissent un seul token actif', async () => {
    const secondId = `parallel-user-${suffix}`;
    await prisma.clientUser.create({ data: {
      id: secondId, email: `parallel-${suffix}@example.invalid`, password: await bcrypt.hash('OldPassword1!', 10),
      firstName: 'Parallel', lastName: 'User', organizationId: ids.org, clientId: ids.client, buildingIds: [],
    } });
    const results = await Promise.all([
      service.forgotPassword(`parallel-${suffix}@example.invalid`),
      service.forgotPassword(`parallel-${suffix}@example.invalid`),
    ]);
    expect(results[0]).toEqual(results[1]);
    const records = await prisma.clientPasswordResetToken.findMany({ where: { clientUserId: secondId } });
    expect(records).toHaveLength(2);
    expect(records.filter((item) => item.usedAt === null)).toHaveLength(1);
  });

  it('rate limit par identite conserve la reponse neutre', async () => {
    const response = await service.forgotPassword(`reset-${suffix}@example.invalid`);
    const sends = email.sendClientPasswordReset.mock.calls.length;
    expect(await service.forgotPassword(`reset-${suffix}@example.invalid`)).toEqual(response);
    expect(email.sendClientPasswordReset).toHaveBeenCalledTimes(sends);
    expect(await service.forgotPassword('nobody@example.invalid')).toEqual(response);
  });

  it('expiration et compte inactif refusent sans changer le mot de passe', async () => {
    const token = randomBytes(32).toString('base64url');
    await prisma.clientPasswordResetToken.create({ data: { clientUserId: ids.user, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() - 1000) } });
    await expect(service.resetPassword(token, 'NewPassword1!')).rejects.toThrow('invalide');
    const fresh = randomBytes(32).toString('base64url');
    await prisma.clientPasswordResetToken.create({ data: { clientUserId: ids.user, tokenHash: createHash('sha256').update(fresh).digest('hex'), expiresAt: new Date(Date.now() + 30000) } });
    await prisma.clientUser.update({ where: { id: ids.user }, data: { isActive: false } });
    await expect(service.resetPassword(fresh, 'NewPassword1!')).rejects.toThrow('invalide');
    await prisma.clientUser.update({ where: { id: ids.user }, data: { isActive: true } });
  });

  it('concurrence reset: un seul succes, revocation et audit immuable', async () => {
    const token = randomBytes(32).toString('base64url');
    const record = await prisma.clientPasswordResetToken.create({ data: {
      clientUserId: ids.user, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 300000),
    } });
    await prisma.clientTrustedDevice.create({ data: { userId: ids.user, token: `trusted-${suffix}`, expiresAt: new Date(Date.now() + 300000) } });
    const before = await prisma.clientUser.findUniqueOrThrow({ where: { id: ids.user } });
    const oldJwt = jwt.sign({ type: 'CLIENT', sub: ids.user, organizationId: ids.org, sessionVersion: before.sessionVersion });
    const results = await Promise.allSettled([
      service.resetPassword(token, 'NewPassword1!'), service.resetPassword(token, 'AnotherPassword1!'),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const after = await prisma.clientUser.findUniqueOrThrow({ where: { id: ids.user } });
    expect(after.sessionVersion).toBe(before.sessionVersion + 1);
    expect(await prisma.clientTrustedDevice.count({ where: { userId: ids.user } })).toBe(0);
    expect((await prisma.clientPasswordResetToken.findUniqueOrThrow({ where: { id: record.id } })).usedAt).not.toBeNull();
    await expect(service.resetPassword(token, 'AgainPassword1!')).rejects.toThrow('invalide');
    const guard = new ClientJwtGuard(jwt, prisma as any);
    const context = (value: string) => ({ switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: `Bearer ${value}` } }) }) }) as any;
    await expect(guard.canActivate(context(oldJwt))).rejects.toThrow();
    await expect(guard.canActivate(context(jwt.sign({ type: 'CLIENT', sub: ids.user, organizationId: ids.org, sessionVersion: after.sessionVersion })))).resolves.toBe(true);
    const audit = await prisma.clientSecurityAuditEvent.findFirstOrThrow({ where: { clientUserId: ids.user, eventType: 'PASSWORD_RESET_COMPLETED' } });
    await expect(prisma.clientSecurityAuditEvent.update({ where: { id: audit.id }, data: { eventType: 'CHANGED' } })).rejects.toThrow('append-only');
    await expect(prisma.clientSecurityAuditEvent.delete({ where: { id: audit.id } })).rejects.toThrow('append-only');
  });
});
