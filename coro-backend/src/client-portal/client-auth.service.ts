import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
@Injectable()
export class ClientAuthService {
  private readonly logger = new Logger('ClientAuthService');

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string, trustedToken?: string) {
    const clientUser = await this.prisma.clientUser.findUnique({
      where: { email },
      include: { client: true, organization: true },
    });
    if (!clientUser || !clientUser.isActive) {
      this.logger.warn(`[CLIENT-AUTH] Tentative de connexion échouée — courriel inconnu ou inactif : ${email}`);
      throw new UnauthorizedException('Email ou mot de passe invalide.');
    }
    const valid = await bcrypt.compare(password, clientUser.password);
    if (!valid) {
      this.logger.warn(`[CLIENT-AUTH] Tentative de connexion échouée — mot de passe incorrect : ${email}`);
      throw new UnauthorizedException('Email ou mot de passe invalide.');
    }

    // Vérifier si un token de confiance valide existe (skip MFA 90 jours)
    if (trustedToken) {
      const trusted = await this.prisma.clientTrustedDevice.findFirst({
        where: { token: trustedToken, userId: clientUser.id, expiresAt: { gt: new Date() } },
      });
      if (trusted) {
        this.logger.log(`[CLIENT-AUTH] Token de confiance valide — skip MFA : ${email}`);
        const token = this.jwt.sign({
          sub: clientUser.id,
          email: clientUser.email,
          role: clientUser.role,
          clientId: clientUser.clientId,
          organizationId: clientUser.organizationId,
          buildingIds: clientUser.buildingIds,
          type: 'CLIENT',
        });
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
          },
        };
      }
    }

    this.logger.log(`[CLIENT-AUTH] Identifiants valides — envoi code MFA : ${email}`);

    // Générer code MFA 6 chiffres
    const mfaCode = Math.floor(100000 + Math.random() * 900000).toString();
    const mfaExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.clientUser.update({
      where: { id: clientUser.id },
      data: { mfaCode, mfaCodeExpiry: mfaExpiry } as any,
    });

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY || '' },
      body: JSON.stringify({
        sender: { name: 'CORO', email: 'info@getcoro.io' },
        to: [{ email: clientUser.email, name: `${clientUser.firstName} ${clientUser.lastName}` }],
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

    return { mfaRequired: true, email };
  }

  async verifyMfa(email: string, code: string) {
    const clientUser = await this.prisma.clientUser.findUnique({
      where: { email },
      include: { client: true },
    });
    if (!clientUser) throw new UnauthorizedException('Identifiants invalides.');

    const userData = clientUser as any;
    if (!userData.mfaCode || !userData.mfaCodeExpiry) throw new UnauthorizedException('Aucun code MFA en attente.');
    if (new Date() > userData.mfaCodeExpiry) throw new UnauthorizedException('Code MFA expiré. Veuillez vous reconnecter.');
    if (userData.mfaCode !== code) throw new UnauthorizedException('Code MFA invalide.');

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

    const token = this.jwt.sign({
      sub: clientUser.id,
      email: clientUser.email,
      role: clientUser.role,
      clientId: clientUser.clientId,
      organizationId: clientUser.organizationId,
      buildingIds: clientUser.buildingIds,
      type: 'CLIENT',
    });

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
    const password = data.temporaryPassword || Math.random().toString(36).slice(-10) + 'A1!';
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

  private validatePasswordStrength(password: string): void {
    if (password.length < 8) throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères.');
    if (!/[A-Z]/.test(password)) throw new BadRequestException('Le mot de passe doit contenir au moins une majuscule.');
    if (!/[a-z]/.test(password)) throw new BadRequestException('Le mot de passe doit contenir au moins une minuscule.');
    if (!/[0-9]/.test(password)) throw new BadRequestException('Le mot de passe doit contenir au moins un chiffre.');
    if (!/[^A-Za-z0-9]/.test(password)) throw new BadRequestException('Le mot de passe doit contenir au moins un caractère spécial.');
  }

  async changePassword(clientUserId: string, newPassword: string) {
    this.validatePasswordStrength(newPassword);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return this.prisma.clientUser.update({
      where: { id: clientUserId },
      data: { password: hashedPassword },
    });
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
    if (magicLink.expiresAt < new Date()) throw new UnauthorizedException('Lien expiré.');

    // Marquer comme utilisé
    await this.prisma.magicLink.update({
      where: { token },
      data: { usedAt: new Date() },
    });

    const clientUser = magicLink.user;

    const jwtToken = this.jwt.sign({
      sub: clientUser.id,
      email: clientUser.email,
      role: clientUser.role,
      clientId: clientUser.clientId,
      organizationId: clientUser.organizationId,
      buildingIds: clientUser.buildingIds,
      type: 'CLIENT',
    });

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
      },
    };
  }
}