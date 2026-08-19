import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  private readonly logger = new Logger('AuthService');

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.logger.warn(`[AUTH] Tentative de connexion échouée — courriel inconnu : ${email}`);
      throw new UnauthorizedException('Identifiants invalides');
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      this.logger.warn(`[AUTH] Tentative de connexion échouée — mot de passe incorrect : ${email}`);
      throw new UnauthorizedException('Identifiants invalides');
    }
    this.logger.log(`[AUTH] Identifiants valides — envoi code MFA : ${email}`);

    // Générer code MFA 6 chiffres
    const mfaCode = Math.floor(100000 + Math.random() * 900000).toString();
    const mfaExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.user.update({
      where: { id: user.id },
      data: { mfaCode, mfaCodeExpiry: mfaExpiry },
    });

    // Envoyer le code par courriel
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY || '' },
      body: JSON.stringify({
        sender: { name: 'CORO', email: 'info@getcoro.io' },
        to: [{ email: user.email, name: `${user.firstName} ${user.lastName}` }],
        subject: `${mfaCode} — Votre code de connexion CORO`,
        htmlContent: `
          <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;">
            <div style="background:#2C3E50;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
              <span style="color:#FFFFFF;font-size:28px;font-weight:900;">CO<span style="color:#C0392B;">RO</span></span>
            </div>
            <div style="background:#FFFFFF;padding:32px;border:1px solid #E9ECEF;border-radius:0 0 8px 8px;text-align:center;">
              <p style="margin:0 0 8px;font-size:16px;color:#2C3E50;">Votre code de connexion</p>
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
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Identifiants invalides');

    if (!user.mfaCode || !user.mfaCodeExpiry) {
      throw new UnauthorizedException('Aucun code MFA en attente.');
    }
    if (new Date() > user.mfaCodeExpiry) {
      throw new UnauthorizedException('Code MFA expiré. Veuillez vous reconnecter.');
    }
    if (user.mfaCode !== code) {
      this.logger.warn(`[MFA] Code incorrect pour : ${email}`);
      throw new UnauthorizedException('Code MFA invalide.');
    }

    // Invalider le code
    await this.prisma.user.update({
      where: { id: user.id },
      data: { mfaCode: null, mfaCodeExpiry: null },
    });

    this.logger.log(`[AUTH] MFA validé — connexion complète : ${email}`);

    const payload = { sub: user.id, email: user.email, role: user.role, organizationId: user.organizationId };
    const refreshToken = await this.generateRefreshToken(user.id);
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }

    private async generateRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours
    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });
    return token;
  }

  async refreshAccessToken(refreshToken: string) {
    const record = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });
    if (!record || record.isRevoked || new Date() > record.expiresAt) {
      throw new UnauthorizedException('Refresh token invalide ou expiré.');
    }
    // Rotation — invalider l'ancien token et en créer un nouveau
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { isRevoked: true },
    });
    const newRefreshToken = await this.generateRefreshToken(record.userId);
    const payload = {
      sub: record.user.id,
      email: record.user.email,
      role: record.user.role,
      organizationId: record.user.organizationId,
    };
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refresh_token: newRefreshToken,
    };
  }

  async revokeRefreshToken(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { isRevoked: true },
    });
    return { success: true };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    // On retourne toujours succès pour ne pas révéler si l'email existe
    if (!user) return { success: true };

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });

    const resetUrl = `https://app.getcoro.io/reset-password?token=${token}`;

    try {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.BREVO_API_KEY || '',
        },
        body: JSON.stringify({
          sender: { name: 'CORO', email: 'info@getcoro.io' },
          to: [{ email: user.email, name: `${user.firstName} ${user.lastName}` }],
          subject: 'Réinitialisation de votre mot de passe CORO',
          htmlContent: `
            <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#2C3E50;padding:24px;border-radius:8px 8px 0 0;">
                <span style="color:#FFFFFF;font-size:28px;font-weight:900;">CO<span style="color:#C0392B;">RO</span></span>
              </div>
              <div style="background:#FFFFFF;padding:32px;border:1px solid #E9ECEF;border-radius:0 0 8px 8px;">
                <h2 style="color:#2C3E50;margin:0 0 12px;">Réinitialisation de mot de passe</h2>
                <p style="color:#6C757D;margin:0 0 24px;">Bonjour ${user.firstName},<br><br>Vous avez demandé la réinitialisation de votre mot de passe CORO. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.</p>
                <a href="${resetUrl}" style="display:inline-block;background:#C0392B;color:#FFFFFF;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;">
                  Réinitialiser mon mot de passe →
                </a>
                <p style="color:#ADB5BD;font-size:13px;margin:24px 0 0;">Ce lien est valide pendant 24 heures. Si vous n'avez pas demandé cette réinitialisation, ignorez ce courriel.</p>
              </div>
            </div>
          `,
        }),
      });
    } catch (e) {
      console.error('Erreur envoi courriel reset:', e);
    }

    return { success: true };
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères.');
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('Le mot de passe doit contenir au moins une majuscule.');
    }
    if (!/[a-z]/.test(password)) {
      throw new BadRequestException('Le mot de passe doit contenir au moins une minuscule.');
    }
    if (!/[0-9]/.test(password)) {
      throw new BadRequestException('Le mot de passe doit contenir au moins un chiffre.');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      throw new BadRequestException('Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*...).');
    }
  }

  async resetPassword(token: string, newPassword: string) {
    this.validatePasswordStrength(newPassword);
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) throw new BadRequestException('Lien invalide ou expiré.');

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { success: true };
  }
}