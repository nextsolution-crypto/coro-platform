import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { requireJwtSecret, requirePlatformMfaSecret } from './auth-security.config';

describe('Platform authentication security', () => {
  const originalJwt = process.env.JWT_SECRET;
  const originalMfa = process.env.PLATFORM_MFA_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
    process.env.PLATFORM_MFA_SECRET = 'test-mfa-secret-at-least-32-characters-long';
  });
  afterAll(() => {
    process.env.JWT_SECRET = originalJwt;
    process.env.PLATFORM_MFA_SECRET = originalMfa;
  });

  it('refuse une configuration JWT ou MFA absente/faible', () => {
    delete process.env.JWT_SECRET;
    expect(requireJwtSecret).toThrow('JWT_SECRET');
    process.env.PLATFORM_MFA_SECRET = 'short';
    expect(requirePlatformMfaSecret).toThrow('PLATFORM_MFA_SECRET');
  });

  it('rejette un JWT legacy sans authVersion', async () => {
    const prisma = { user: { findUnique: jest.fn() } } as any;
    const strategy = new JwtStrategy(prisma);
    await expect(strategy.validate({ sub: 'user-1' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    [null, 1],
    [{ id: 'user-1', email: 'u@example.test', role: 'SUPER_ADMIN', organizationId: 'org', isActive: false, authVersion: 1 }, 1],
    [{ id: 'user-1', email: 'u@example.test', role: 'OPERATOR', organizationId: 'org', isActive: true, authVersion: 2 }, 1],
  ])('refuse utilisateur absent, inactif ou version perimee', async (user, authVersion) => {
    const strategy = new JwtStrategy({ user: { findUnique: jest.fn().mockResolvedValue(user) } } as any);
    await expect(strategy.validate({ sub: 'user-1', authVersion })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('retourne le role courant de la DB et non celui du JWT', async () => {
    const current = { id: 'user-1', email: 'u@example.test', role: 'OPERATOR', organizationId: 'org', isActive: true, authVersion: 4 };
    const strategy = new JwtStrategy({ user: { findUnique: jest.fn().mockResolvedValue(current) } } as any);
    await expect(strategy.validate({ sub: 'user-1', role: 'SUPER_ADMIN', authVersion: 4 })).resolves.toMatchObject({ role: 'OPERATOR' });
  });
});
