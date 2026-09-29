import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { requirePlatformMfaSecret } from './auth-security.config';
import { PLATFORM_MFA_EMAIL_SENDER, renderPlatformMfaEmail } from './platform-mfa-email';

const MFA_TTL_MS = 10 * 60 * 1000;
export const PLATFORM_MFA_MAX_ATTEMPTS = 5;
const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly mfaSecret = requirePlatformMfaSecret();

  constructor(private readonly usersService: UsersService, private readonly jwtService: JwtService, private readonly prisma: PrismaService) {}

  private payload(user: { id: string; email: string; role: any; organizationId: string; authVersion: number }) {
    return { sub: user.id, email: user.email, role: user.role, organizationId: user.organizationId, authVersion: user.authVersion };
  }

  private verifier(challengeId: string, code: string) {
    return crypto.createHmac('sha256', this.mfaSecret).update(`platform-mfa:v1:${challengeId}:${code}`).digest('hex');
  }

  private publicUser(user: any) {
    return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, organizationId: user.organizationId };
  }

  async login(email: string, password: string, trustedToken?: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user?.isActive || !(await bcrypt.compare(password, user.password))) {
      this.logger.warn('[AUTH] Login rejected.');
      throw new UnauthorizedException('Identifiants invalides');
    }
    if (trustedToken) {
      const trusted = await this.prisma.trustedDevice.findFirst({ where: { token: trustedToken, userId: user.id, authVersion: user.authVersion, expiresAt: { gt: new Date() } } });
      if (trusted) return this.issueSession(user);
    }
    const code = crypto.randomInt(100000, 1000000).toString();
    const challengeId = crypto.randomUUID();
    await this.prisma.platformMfaChallenge.upsert({
      where: { userId: user.id },
      create: { id: challengeId, userId: user.id, verifier: this.verifier(challengeId, code), expiresAt: new Date(Date.now() + MFA_TTL_MS) },
      update: { id: challengeId, verifier: this.verifier(challengeId, code), expiresAt: new Date(Date.now() + MFA_TTL_MS), attemptCount: 0, consumedAt: null, createdAt: new Date() },
    });
    await this.sendEmail(
      user.email,
      `${code} — Votre code de connexion CORO`,
      renderPlatformMfaEmail(code),
      `${user.firstName} ${user.lastName}`.trim(),
    );
    return { mfaRequired: true, email: user.email };
  }

  async verifyMfa(email: string, code: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user?.isActive) throw new UnauthorizedException('Identifiants invalides');
    const challenge = await this.prisma.platformMfaChallenge.findUnique({ where: { userId: user.id } });
    if (!challenge || challenge.consumedAt || challenge.attemptCount >= PLATFORM_MFA_MAX_ATTEMPTS) throw new UnauthorizedException('Code MFA invalide.');
    if (challenge.expiresAt <= new Date()) throw new UnauthorizedException('Code MFA expiré. Veuillez vous reconnecter.');
    const actual = Buffer.from(this.verifier(challenge.id, code));
    const expected = Buffer.from(challenge.verifier);
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
      await this.prisma.platformMfaChallenge.updateMany({ where: { id: challenge.id, consumedAt: null, attemptCount: challenge.attemptCount }, data: { attemptCount: { increment: 1 } } });
      throw new UnauthorizedException('Code MFA invalide.');
    }
    const consumed = await this.prisma.platformMfaChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null, attemptCount: { lt: PLATFORM_MFA_MAX_ATTEMPTS }, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) throw new UnauthorizedException('Code MFA invalide.');
    const trustedToken = crypto.randomUUID();
    await this.prisma.trustedDevice.create({ data: { token: trustedToken, userId: user.id, authVersion: user.authVersion, expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) } });
    return { ...(await this.issueSession(user)), trusted_token: trustedToken };
  }

  private async issueSession(user: any) {
    const refreshToken = await this.generateRefreshToken(user.id, user.authVersion);
    return { access_token: this.jwtService.sign(this.payload(user), { expiresIn: '15m' }), refresh_token: refreshToken, user: this.publicUser(user) };
  }

  private async generateRefreshToken(userId: string, authVersion: number, tx: any = this.prisma) {
    const token = crypto.randomBytes(40).toString('hex');
    await tx.refreshToken.create({ data: { tokenDigest: sha256(token), userId, authVersion, expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) } });
    return token;
  }

  async refreshAccessToken(refreshToken: string) {
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenDigest: sha256(refreshToken) }, include: { user: true } });
    if (!record || record.isRevoked || record.expiresAt <= new Date() || !record.user.isActive || record.authVersion !== record.user.authVersion) throw new UnauthorizedException('Refresh token invalide ou expiré.');
    const replacement = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.refreshToken.updateMany({ where: { id: record.id, isRevoked: false }, data: { isRevoked: true } });
      if (claimed.count !== 1) throw new UnauthorizedException('Refresh token invalide ou expiré.');
      return this.generateRefreshToken(record.userId, record.user.authVersion, tx);
    });
    return { access_token: this.jwtService.sign(this.payload(record.user), { expiresIn: '15m' }), refresh_token: replacement };
  }

  async revokeRefreshToken(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({ where: { tokenDigest: sha256(refreshToken) }, data: { isRevoked: true } });
    return { success: true };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return { success: true };
    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.user.update({ where: { id: user.id }, data: { resetToken: token, resetTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    const resetUrl = `https://app.getcoro.io/reset-password?token=${token}`;
    await this.sendEmail(user.email, 'Réinitialisation de votre mot de passe CORO', `<p>Réinitialisez votre mot de passe : <a href="${resetUrl}">continuer</a>.</p>`);
    return { success: true };
  }

  async resetPassword(token: string, password: string) {
    this.validatePassword(password);
    const user = await this.prisma.user.findFirst({ where: { resetToken: token, resetTokenExpiry: { gt: new Date() } } });
    if (!user) throw new BadRequestException('Lien invalide ou expiré.');
    const hashed = await bcrypt.hash(password, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { password: hashed, resetToken: null, resetTokenExpiry: null, authVersion: { increment: 1 } } }),
      this.prisma.refreshToken.updateMany({ where: { userId: user.id }, data: { isRevoked: true } }),
      this.prisma.trustedDevice.deleteMany({ where: { userId: user.id } }),
      this.prisma.platformMfaChallenge.deleteMany({ where: { userId: user.id } }),
    ]);
    return { success: true };
  }

  private validatePassword(password: string) {
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.');
  }

  private async sendEmail(to: string, subject: string, htmlContent: string, recipientName?: string) {
    try {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY || '' },
        body: JSON.stringify({
          sender: PLATFORM_MFA_EMAIL_SENDER,
          to: [{ email: to, ...(recipientName ? { name: recipientName } : {}) }],
          subject,
          htmlContent,
        }),
      });
    } catch { this.logger.error('[AUTH] Email delivery failed.'); }
  }
}
