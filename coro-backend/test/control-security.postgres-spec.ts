import { PrismaClient, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { UsersService } from '../src/users/users.service';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { AuthService } from '../src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error('TEST_DATABASE_URL est obligatoire pour control-security.postgres-spec');

describe('CONTROL-00B PostgreSQL invariants', () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalMfaSecret = process.env.PLATFORM_MFA_SECRET;
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const suffix = randomUUID();
  const ids = { org: `control-org-${suffix}`, actor: `control-actor-${suffix}`, target: `control-target-${suffix}`, mfa: `control-mfa-${suffix}` };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'control-00b-test-jwt-secret-32-characters';
    process.env.PLATFORM_MFA_SECRET = 'control-00b-test-mfa-secret-32-characters';
    await prisma.$connect();
    await prisma.organization.create({ data: { id: ids.org, name: 'CONTROL-00B test', licenseType: 'ENTREPRISE' } });
    await prisma.user.createMany({ data: [
      { id: ids.actor, email: `actor-${suffix}@example.invalid`, password: 'unused', firstName: 'Admin', lastName: 'One', role: UserRole.SUPER_ADMIN, organizationId: ids.org },
      { id: ids.target, email: `target-${suffix}@example.invalid`, password: 'unused', firstName: 'Target', lastName: 'User', role: UserRole.OPERATOR, organizationId: ids.org },
      { id: ids.mfa, email: `mfa-${suffix}@example.invalid`, password: await bcrypt.hash('Password1!', 10), firstName: 'Mfa', lastName: 'User', role: UserRole.OPERATOR, organizationId: ids.org },
    ] });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
    if (originalMfaSecret === undefined) delete process.env.PLATFORM_MFA_SECRET;
    else process.env.PLATFORM_MFA_SECRET = originalMfaSecret;
  });

  it('initialise authVersion et lie les credentials durables a cette version', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: ids.target } });
    expect(user.authVersion).toBe(1);
    await prisma.refreshToken.create({ data: { tokenDigest: Buffer.from(suffix).toString('hex').padEnd(64, 'a').slice(0, 64), userId: user.id, authVersion: user.authVersion, expiresAt: new Date(Date.now() + 60_000) } });
    await prisma.trustedDevice.create({ data: { token: `trusted-${suffix}`, userId: user.id, authVersion: user.authVersion, expiresAt: new Date(Date.now() + 60_000) } });
    await prisma.user.update({ where: { id: user.id }, data: { authVersion: { increment: 1 } } });
    expect((await prisma.refreshToken.findFirstOrThrow({ where: { userId: user.id } })).authVersion).toBe(1);
  });

  it('garantit un seul challenge MFA par utilisateur et une consommation conditionnelle unique', async () => {
    const challenge = await prisma.platformMfaChallenge.create({ data: { userId: ids.target, verifier: 'b'.repeat(64), expiresAt: new Date(Date.now() + 60_000) } });
    await expect(prisma.platformMfaChallenge.create({ data: { userId: ids.target, verifier: 'c'.repeat(64), expiresAt: new Date(Date.now() + 60_000) } })).rejects.toThrow();
    const consume = () => prisma.platformMfaChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: new Date() } });
    const results = await Promise.all([consume(), consume()]);
    expect(results.map((item) => item.count).sort()).toEqual([0, 1]);
  });

  it('rend AdminAuditEvent append-only et conserve uniquement le snapshot safe fourni', async () => {
    const event = await prisma.adminAuditEvent.create({ data: {
      actorUserId: ids.actor, actorDisplayName: 'Admin One', actorRole: UserRole.SUPER_ADMIN,
      action: 'TEST_ACTION', targetType: 'User', targetId: ids.target, organizationId: ids.org,
      requestId: `request-${suffix}`, beforeData: { role: 'OPERATOR' }, afterData: { role: 'ADMIN' },
    } });
    expect(JSON.stringify(event)).not.toMatch(/password|token|secret|otp/i);
    await expect(prisma.adminAuditEvent.update({ where: { id: event.id }, data: { reason: 'changed' } })).rejects.toThrow();
    await expect(prisma.adminAuditEvent.delete({ where: { id: event.id } })).rejects.toThrow();
  });

  it('rollback une commande MUST-audit si son audit ne peut pas etre ecrit', async () => {
    const users = new UsersService(prisma as any, { sendWelcomeTeamMember: jest.fn() } as any, new AdminAuditService());
    const email = `rollback-${suffix}@example.invalid`;
    await expect(users.createInOrganization(ids.org, {
      email, password: 'Password1!', firstName: 'Rollback', lastName: 'Test', role: UserRole.OPERATOR,
    }, { userId: randomUUID(), role: UserRole.SUPER_ADMIN })).rejects.toThrow('Acteur administratif introuvable');
    await expect(prisma.user.count({ where: { email } })).resolves.toBe(0);
  });

  it('protege le dernier SUPER_ADMIN meme sous deux desactivations concurrentes', async () => {
    const otherSuperAdmins = await prisma.user.findMany({
      where: { role: UserRole.SUPER_ADMIN, id: { notIn: [ids.actor, ids.target] } },
      select: { id: true, role: true, isActive: true },
    });
    await prisma.user.updateMany({ where: { id: { in: otherSuperAdmins.map((item) => item.id) } }, data: { role: UserRole.OPERATOR } });
    await prisma.user.update({ where: { id: ids.target }, data: { role: UserRole.SUPER_ADMIN } });
    const users = new UsersService(prisma as any, {} as any, new AdminAuditService());
    try {
      const results = await Promise.allSettled([
        users.toggleActiveInOrganization(ids.target, ids.org, false, { userId: ids.actor, role: UserRole.SUPER_ADMIN }, 'Test concurrence'),
        users.toggleActiveInOrganization(ids.actor, ids.org, false, { userId: ids.target, role: UserRole.SUPER_ADMIN }, 'Test concurrence'),
      ]);
      expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
      expect(await prisma.user.count({ where: { role: UserRole.SUPER_ADMIN, isActive: true } })).toBe(1);
    } finally {
      await prisma.user.updateMany({ where: { id: { in: otherSuperAdmins.map((item) => item.id) } }, data: { role: UserRole.SUPER_ADMIN } });
    }
  });

  it('consomme MFA et refresh une seule fois sous concurrence', async () => {
    const users = { findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }) };
    const jwt = new JwtService({ secret: process.env.JWT_SECRET! });
    const service = new AuthService(users as any, jwt, prisma as any);
    const sent: any[] = [];
    const originalFetch = global.fetch;
    global.fetch = jest.fn(async (_url, options: any) => {
      sent.push(JSON.parse(options.body));
      return { ok: true } as any;
    }) as any;
    try {
      await service.login(`mfa-${suffix}@example.invalid`, 'Password1!');
      const code = sent[0].subject.match(/^([0-9]{6})/)![1];
      const stored = await prisma.platformMfaChallenge.findUniqueOrThrow({ where: { userId: ids.mfa } });
      expect(stored.verifier).not.toContain(code);
      const attempts = await Promise.allSettled([
        service.verifyMfa(`mfa-${suffix}@example.invalid`, code),
        service.verifyMfa(`mfa-${suffix}@example.invalid`, code),
      ]);
      expect(attempts.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
      const session = (attempts.find((item): item is PromiseFulfilledResult<any> => item.status === 'fulfilled'))!.value;
      const refreshes = await Promise.allSettled([service.refreshAccessToken(session.refresh_token), service.refreshAccessToken(session.refresh_token)]);
      expect(refreshes.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
