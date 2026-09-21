import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { EmailService } from './email.service';
import { validateClientPassword } from './client-password-policy';

const RESET_LIFETIME_MS = 30 * 60 * 1000;
const RESET_WINDOW_MS = 15 * 60 * 1000;
const RESET_WINDOW_LIMIT = 3;
const RESET_RESPONSE = { message: 'Si un compte actif correspond à cette adresse, un lien de réinitialisation vous sera envoyé.' };
const INVALID_RESET = 'Ce lien de réinitialisation est invalide ou n’est plus disponible.';


@Injectable()
export class ClientAuthService {
  private readonly logger = new Logger('ClientAuthService');

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private emailService: EmailService,
  ) {}

  private async findClientByEmail(email: string) {
    const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!normalized || normalized.length > 320) return null;
    const matches = await this.prisma.clientUser.findMany({
      where: { email: { equals: normalized, mode: 'insensitive' } },
      take: 2,
      include: { client: true, organization: true },
    });
    return matches.length === 1 ? matches[0] : null;
  }

  private clientToken(clientUser: any) {
    return this.jwt.sign({
      sub: clientUser.id, email: clientUser.email, role: clientUser.role,
      clientId: clientUser.clientId, organizationId: clientUser.organizationId,
      buildingIds: clientUser.buildingIds, populationPermissions: clientUser.populationPermissions,
      operationalReviewPermissions: clientUser.operationalReviewPermissions,
      correctiveActionPermissions: clientUser.correctiveActionPermissions,
      sessionVersion: clientUser.sessionVersion, type: 'CLIENT',
    });
  }

  async getCurrentUser(clientUserId: string, organizationId: string) {
    const clientUser = await this.prisma.clientUser.findFirst({
      where: { id: clientUserId, organizationId, isActive: true },
      include: { client: { select: { name: true } } },
    });
    if (!clientUser) throw new UnauthorizedException('Session client invalide.');
    return {
      id: clientUser.id,
      email: clientUser.email,
      firstName: clientUser.firstName,
      lastName: clientUser.lastName,
      role: clientUser.role,
      clientId: clientUser.clientId,
      clientName: clientUser.client.name,
      organizationId: clientUser.organizationId,
      populationPermissions: clientUser.populationPermissions,
      operationalReviewPermissions: clientUser.operationalReviewPermissions,
      correctiveActionPermissions: clientUser.correctiveActionPermissions,
    };
  }

  async login(email: string, password: string, trustedToken?: string) {
    const clientUser = await this.findClientByEmail(email);
    if (!clientUser || !clientUser.isActive) {
      this.logger.warn('[CLIENT-AUTH] Connexion refusee');
      throw new UnauthorizedException('Email ou mot de passe invalide.');
    }
    const valid = await bcrypt.compare(password, clientUser.password);
    if (!valid) {
      this.logger.warn('[CLIENT-AUTH] Connexion refusee');
      throw new UnauthorizedException('Email ou mot de passe invalide.');
    }

    // Vérifier si un token de confiance valide existe (skip MFA 90 jours)
    if (trustedToken) {
      const trusted = await this.prisma.clientTrustedDevice.findFirst({
        where: {
          token: trustedToken,
          userId: clientUser.id,
          expiresAt: { gt: new Date() },
        },
      });
      if (trusted) {
        this.logger.log('[CLIENT-AUTH] Appareil de confiance valide');
        const token = this.clientToken(clientUser);
        return {
          token,
          user: {
            id: clientUser.id,
            email: clientUser.email,
            firstName: clientUser.firstName,
            lastName: clientUser.lastName,
            role: clientUser.role,
            clientId: clientUser.clientId,
            clientName: clientUser.client.name,
            organizationId: clientUser.organizationId,
            populationPermissions: clientUser.populationPermissions,
            operationalReviewPermissions: clientUser.operationalReviewPermissions,
            correctiveActionPermissions: clientUser.correctiveActionPermissions,
          },
        };
      }
    }

    this.logger.log('[CLIENT-AUTH] Envoi code MFA');

    // Générer code MFA 6 chiffres
    const mfaCode = Math.floor(100000 + Math.random() * 900000).toString();
    const mfaExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.clientUser.update({
      where: { id: clientUser.id },
      data: { mfaCode, mfaCodeExpiry: mfaExpiry } as any,
    });

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY || '',
      },
      body: JSON.stringify({
        sender: { name: 'CORO', email: 'info@getcoro.io' },
        to: [
          {
            email: clientUser.email,
            name: `${clientUser.firstName} ${clientUser.lastName}`,
          },
        ],
        subject: `${mfaCode} — Votre code de connexion CORO`,
        htmlContent: `
          <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;">
            <div style="background:#2C3E50;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
              <span style="color:#FFFFFF;font-size:28px;font-weight:900;">CO<span style="color:#C0392B;">RO</span></span>
            </div>
            <div style="background:#FFFFFF;padding:32px;border:1px solid #E9ECEF;border-radius:0 0 8px 8px;text-align:center;">
              <p style="margin:0 0 8px;font-size:16px;color:#2C3E50;">Votre code de connexion — Portail Client</p>
              <div style="margin:24px 0;padding:20px;background:#F8F9FA;border-radius:8px;border:2px dashed #C0392B;">
                <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#C0392B;">${mfaCode}</span>
              </div>
              <p style="margin:0;font-size:13px;color:#6C757D;">Ce code est valide pendant <strong>10 minutes</strong>.</p>
              <p style="margin:8px 0 0;font-size:13px;color:#ADB5BD;">Si vous n'avez pas demandé ce code, ignorez ce courriel.</p>
            </div>
          </div>
        `,
      }),
    });

    return { mfaRequired: true, email: clientUser.email };
  }

  async verifyMfa(email: string, code: string) {
    const clientUser = await this.findClientByEmail(email);
    if (!clientUser || !clientUser.isActive) throw new UnauthorizedException('Identifiants invalides.');

    const userData = clientUser as any;
    if (!userData.mfaCode || !userData.mfaCodeExpiry)
      throw new UnauthorizedException('Aucun code MFA en attente.');
    if (new Date() > userData.mfaCodeExpiry)
      throw new UnauthorizedException(
        'Code MFA expiré. Veuillez vous reconnecter.',
      );
    if (userData.mfaCode !== code)
      throw new UnauthorizedException('Code MFA invalide.');

    await this.prisma.clientUser.update({
      where: { id: clientUser.id },
      data: { mfaCode: null, mfaCodeExpiry: null } as any,
    });

    // Générer un token de confiance 90 jours
    const trustedToken = crypto.randomUUID();
    await this.prisma.clientTrustedDevice.create({
      data: {
        token: trustedToken,
        userId: clientUser.id,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    const token = this.clientToken(clientUser);

    return {
      token,
      trusted_token: trustedToken,
      user: {
        id: clientUser.id,
        email: clientUser.email,
        firstName: clientUser.firstName,
        lastName: clientUser.lastName,
        role: clientUser.role,
        clientId: clientUser.clientId,
        clientName: clientUser.client?.name,
        organizationId: clientUser.organizationId,
        populationPermissions: clientUser.populationPermissions,
        operationalReviewPermissions: clientUser.operationalReviewPermissions,
        correctiveActionPermissions: clientUser.correctiveActionPermissions,
      },
    };
  }

  async createClientUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    role: 'CLIENT_MANAGER' | 'CLIENT_CORPORATE';
    clientId: string;
    organizationId: string;
    temporaryPassword?: string;
  }) {
    const password =
      data.temporaryPassword || Math.random().toString(36).slice(-10) + 'A1!';
    const hashedPassword = await bcrypt.hash(password, 10);

    const existing = await this.prisma.clientUser.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return { clientUser: existing, password: null, alreadyExists: true };
    }

    const clientUser = await this.prisma.clientUser.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role as any,
        clientId: data.clientId,
        organizationId: data.organizationId,
      },
    });

    return { clientUser, password, alreadyExists: false };
  }

  async changePassword(clientUserId: string, newPassword: string) {
    validateClientPassword(newPassword);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.clientUser.update({
      where: { id: clientUserId },
      data: { password: hashedPassword },
    });
    return { success: true };
  }

  async forgotPassword(email: string) {
    const startedAt = Date.now();
    try {
      const clientUser = await this.findClientByEmail(email);
      if (!clientUser?.isActive) return RESET_RESPONSE;

      const rawToken = crypto.randomBytes(32).toString('base64url');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const now = new Date();
      const created = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "ClientUser" WHERE id = ${clientUser.id} FOR UPDATE`;
        const current = await tx.clientUser.findUnique({ where: { id: clientUser.id }, select: { isActive: true } });
        if (!current?.isActive) return false;
        const count = await tx.clientPasswordResetToken.count({
          where: { clientUserId: clientUser.id, createdAt: { gt: new Date(now.getTime() - RESET_WINDOW_MS) } },
        });
        if (count >= RESET_WINDOW_LIMIT) return false;
        await tx.clientPasswordResetToken.updateMany({
          where: { clientUserId: clientUser.id, usedAt: null },
          data: { usedAt: now },
        });
        await tx.clientPasswordResetToken.create({
          data: { clientUserId: clientUser.id, tokenHash, expiresAt: new Date(now.getTime() + RESET_LIFETIME_MS) },
        });
        await tx.clientSecurityAuditEvent.create({
          data: { clientUserId: clientUser.id, organizationId: clientUser.organizationId, eventType: 'PASSWORD_RESET_REQUESTED' },
        });
        return true;
      });
      if (created) {
        const resetUrl = `https://client.getcoro.io/reset-password?token=${encodeURIComponent(rawToken)}`;
        const sent = await this.emailService.sendClientPasswordReset({
          toEmail: clientUser.email, toName: clientUser.firstName, resetUrl,
        });
        if (!sent.success) this.logger.warn('[CLIENT-AUTH] Echec envoi reset');
      }
    } catch {
      this.logger.warn('[CLIENT-AUTH] Demande reset non traitee');
    } finally {
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, 600 - (Date.now() - startedAt))));
    }
    return RESET_RESPONSE;
  }

  async resetPassword(token: string, newPassword: string) {
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new BadRequestException(INVALID_RESET);
    validateClientPassword(newPassword);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction(async (tx) => {
      const record = await tx.clientPasswordResetToken.findUnique({ where: { tokenHash } });
      if (!record) throw new BadRequestException(INVALID_RESET);
      const now = new Date();
      const claim = await tx.clientPasswordResetToken.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claim.count !== 1) throw new BadRequestException(INVALID_RESET);
      const user = await tx.clientUser.findUnique({ where: { id: record.clientUserId }, select: { organizationId: true, isActive: true } });
      if (!user?.isActive) throw new BadRequestException(INVALID_RESET);
      await tx.clientUser.update({
        where: { id: record.clientUserId },
        data: { password: hashedPassword, sessionVersion: { increment: 1 }, mfaCode: null, mfaCodeExpiry: null },
      });
      await tx.clientTrustedDevice.deleteMany({ where: { userId: record.clientUserId } });
      await tx.magicLink.updateMany({ where: { userId: record.clientUserId, usedAt: null }, data: { usedAt: now } });
      await tx.clientPasswordResetToken.updateMany({
        where: { clientUserId: record.clientUserId, id: { not: record.id }, usedAt: null },
        data: { usedAt: now },
      });
      await tx.clientSecurityAuditEvent.create({
        data: { clientUserId: record.clientUserId, organizationId: user.organizationId, eventType: 'PASSWORD_RESET_COMPLETED' },
      });
    });
    return { success: true };
  }

  async generateMagicLink(clientUserId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h

    await this.prisma.magicLink.create({
      data: { token, userId: clientUserId, expiresAt },
    });

    return `https://client.getcoro.io/magic?token=${token}`;
  }

  async validateMagicLink(token: string) {
    const magicLink = await this.prisma.magicLink.findUnique({
      where: { token },
      include: {
        user: {
          include: { client: true },
        },
      },
    });

    if (!magicLink) throw new UnauthorizedException('Lien invalide.');
    if (magicLink.usedAt) throw new UnauthorizedException('Lien déjà utilisé.');
    if (magicLink.expiresAt < new Date())
      throw new UnauthorizedException('Lien expiré.');

    // Marquer comme utilisé
    await this.prisma.magicLink.update({
      where: { token },
      data: { usedAt: new Date() },
    });

    const clientUser = magicLink.user;

    const jwtToken = this.clientToken(clientUser);

    return {
      token: jwtToken,
      user: {
        id: clientUser.id,
        email: clientUser.email,
        firstName: clientUser.firstName,
        lastName: clientUser.lastName,
        role: clientUser.role,
        clientId: clientUser.clientId,
        clientName: clientUser.client?.name,
        organizationId: clientUser.organizationId,
        populationPermissions: clientUser.populationPermissions,
        operationalReviewPermissions: clientUser.operationalReviewPermissions,
        correctiveActionPermissions: clientUser.correctiveActionPermissions,
      },
    };
  }
}
