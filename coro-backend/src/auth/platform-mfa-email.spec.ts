import * as bcrypt from 'bcryptjs';
import { createHmac } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PLATFORM_MFA_EMAIL_SENDER, renderPlatformMfaEmail } from './platform-mfa-email';

describe('Platform MFA email', () => {
  const originalMfaSecret = process.env.PLATFORM_MFA_SECRET;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.PLATFORM_MFA_SECRET = 'test-platform-mfa-secret-at-least-32-characters';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  afterAll(() => {
    if (originalMfaSecret === undefined) delete process.env.PLATFORM_MFA_SECRET;
    else process.env.PLATFORM_MFA_SECRET = originalMfaSecret;
  });

  it('restaure la presentation CORO autour du code', () => {
    const html = renderPlatformMfaEmail('123456');

    expect(html).toContain('CO<span style="color:#C0392B;">RO</span>');
    expect(html).toContain('background:#2C3E50');
    expect(html).toContain('border:2px dashed #C0392B');
    expect(html).toContain('font-size:40px');
    expect(html).toContain('123456');
    expect(html).toContain('<strong>10 minutes</strong>');
    expect(html).toContain("Si vous n'avez pas demandé ce code, ignorez ce courriel.");
  });

  it('envoie le rendu marque sans affaiblir le challenge MFA', async () => {
    const passwordHash = await bcrypt.hash('ValidPassword!1', 4);
    const user = {
      id: 'user-1',
      email: 'martin@example.invalid',
      firstName: 'Martin',
      lastName: 'Gagnon',
      password: passwordHash,
      role: 'SUPER_ADMIN',
      organizationId: 'org-1',
      authVersion: 1,
      isActive: true,
    };
    const upsert = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      trustedDevice: { findFirst: jest.fn() },
      platformMfaChallenge: { upsert },
    } as any;
    const jwtService = { sign: jest.fn() } as any;
    const usersService = { findByEmail: jest.fn().mockResolvedValue(user) } as any;
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);

    const result = await new AuthService(usersService, jwtService, prisma).login(user.email, 'ValidPassword!1');

    expect(result).toEqual({ mfaRequired: true, email: user.email });
    expect(result).not.toHaveProperty('access_token');
    expect(jwtService.sign).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const request = (global.fetch as jest.Mock).mock.calls[0][1];
    const payload = JSON.parse(request.body);
    const code = payload.subject.slice(0, 6);
    expect(code).toMatch(/^\d{6}$/);

    expect(upsert).toHaveBeenCalledTimes(1);
    const persisted = upsert.mock.calls[0][0];
    expect(persisted.create.verifier).toMatch(/^[a-f0-9]{64}$/);
    expect(persisted.create.verifier).not.toBe(code);
    expect(JSON.stringify(persisted)).not.toContain(code);

    expect(payload.sender).toEqual(PLATFORM_MFA_EMAIL_SENDER);
    expect(payload.to).toEqual([{ email: user.email, name: 'Martin Gagnon' }]);
    expect(payload.subject).toBe(`${code} — Votre code de connexion CORO`);
    expect(payload.htmlContent).toBe(renderPlatformMfaEmail(code));
  });

  it('ne permet pas de rejouer un challenge MFA consomme', async () => {
    const code = '123456';
    const challengeId = 'challenge-1';
    const secret = process.env.PLATFORM_MFA_SECRET!;
    const user = {
      id: 'user-1',
      email: 'martin@example.invalid',
      firstName: 'Martin',
      lastName: 'Gagnon',
      role: 'SUPER_ADMIN',
      organizationId: 'org-1',
      authVersion: 1,
      isActive: true,
    };
    const challenge = {
      id: challengeId,
      verifier: createHmac('sha256', secret).update(`platform-mfa:v1:${challengeId}:${code}`).digest('hex'),
      expiresAt: new Date(Date.now() + 60_000),
      attemptCount: 0,
      consumedAt: null,
    };
    const consume = jest.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const prisma = {
      platformMfaChallenge: { findUnique: jest.fn().mockResolvedValue(challenge), updateMany: consume },
      trustedDevice: { create: jest.fn().mockResolvedValue(undefined) },
      refreshToken: { create: jest.fn().mockResolvedValue(undefined) },
    } as any;
    const jwtService = { sign: jest.fn().mockReturnValue('access-token') } as any;
    const usersService = { findByEmail: jest.fn().mockResolvedValue(user) } as any;
    const service = new AuthService(usersService, jwtService, prisma);

    await expect(service.verifyMfa(user.email, code)).resolves.toMatchObject({ access_token: 'access-token' });
    await expect(service.verifyMfa(user.email, code)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.trustedDevice.create).toHaveBeenCalledTimes(1);
    expect(jwtService.sign).toHaveBeenCalledTimes(1);
  });
});
