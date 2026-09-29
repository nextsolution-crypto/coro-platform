import { Injectable, ConflictException, NotFoundException, ForbiddenException, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../client-portal/email.service';
import * as bcrypt from 'bcryptjs';
import { getLimitsForLicense } from '../organizations/license-limits';
import { assertIanaTimeZone } from '../bookings/booking-time';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { UserRole } from '@prisma/client';

export type UpdateMeDto = Partial<{
  firstName: string; lastName: string; email: string; horaireBase: number;
  companyName: string | null; companyPhone: string | null; companyEmail: string | null;
  companyAddress: string | null; companyWebsite: string | null;
  companyTagline: string | null; companyLicense: string | null;
}>;
const SELF_FIELDS = new Set(['firstName', 'lastName', 'email', 'horaireBase']);
const COMPANY_FIELDS = new Set(['companyName', 'companyPhone', 'companyEmail', 'companyAddress', 'companyWebsite', 'companyTagline', 'companyLicense']);

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    @Optional() private adminAudit?: AdminAuditService,
  ) {}

  private get audit(): AdminAuditService {
    if (!this.adminAudit) throw new Error('AdminAuditService is required for administrative user mutations.');
    return this.adminAudit;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true,
        isActive: true,
        horaireBase: true,
        timeZone: true,
        timeZoneVerified: true,
        companyName: true,
        companyLogoB64: true,
        companyLogoFullB64: true,
        companyPhone: true,
        companyEmail: true,
        companyAddress: true,
        companyWebsite: true,
        companyTagline: true,
        companyLicense: true,
      },
    });
  }
  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: any;
    organizationId: string;
  }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: { ...data, password: hashedPassword },
    });
  }
  async updateMe(id: string, data: UpdateMeDto, isManager: boolean) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new BadRequestException('Profil invalide');
    const safeData: UpdateMeDto = {};
    for (const [key, value] of Object.entries(data)) {
      if (!SELF_FIELDS.has(key) && !(isManager && COMPANY_FIELDS.has(key))) throw new BadRequestException(`Champ de profil interdit : ${key}`);
      if (key === 'horaireBase') {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 168) throw new BadRequestException('Horaire de base invalide');
      } else if (typeof value !== 'string' && !(COMPANY_FIELDS.has(key) && value === null)) {
        throw new BadRequestException(`Valeur invalide : ${key}`);
      }
      (safeData as Record<string, unknown>)[key] = value;
    }
    return this.prisma.user.update({
      where: { id },
      data: safeData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        companyName: true,
        companyLogoB64: true,
        companyLogoFullB64: true,
        companyPhone: true,
        companyEmail: true,
        companyAddress: true,
        companyWebsite: true,
        companyTagline: true,
        companyLicense: true,
        horaireBase: true,
        timeZone: true,
        timeZoneVerified: true,
      },
    });
  }

  async updateLogo(id: string, field: 'companyLogoB64' | 'companyLogoFullB64', value: string | null) {
    if (value !== null && typeof value !== 'string') throw new BadRequestException('Logo invalide');
    return this.prisma.user.update({ where: { id }, data: { [field]: value }, select: { id: true, [field]: true } });
  }

  async setTimeZone(userId: string, organizationId: string, timeZone: string) {
    assertIanaTimeZone(timeZone);
    const user = await this.prisma.user.findFirst({ where: { id: userId, organizationId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return this.prisma.user.update({ where: { id: userId }, data: { timeZone, timeZoneVerified: true },
      select: { id: true, timeZone: true, timeZoneVerified: true } });
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 8) throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères.');
    if (!/[A-Z]/.test(password)) throw new BadRequestException('Le mot de passe doit contenir au moins une majuscule.');
    if (!/[a-z]/.test(password)) throw new BadRequestException('Le mot de passe doit contenir au moins une minuscule.');
    if (!/[0-9]/.test(password)) throw new BadRequestException('Le mot de passe doit contenir au moins un chiffre.');
    if (!/[^A-Za-z0-9]/.test(password)) throw new BadRequestException('Le mot de passe doit contenir au moins un caractère spécial.');
  }

  async changePassword(id: string, newPassword: string) {
    this.validatePasswordStrength(newPassword);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id }, data: { password: hashedPassword, authVersion: { increment: 1 } }, select: { id: true } });
      await tx.refreshToken.updateMany({ where: { userId: id }, data: { isRevoked: true } });
      await tx.trustedDevice.deleteMany({ where: { userId: id } });
      await tx.platformMfaChallenge.deleteMany({ where: { userId: id } });
      return user;
    });
  }

  // ============================================================
  // GESTION DES UTILISATEURS PAR ORGANISATION (ADMIN uniquement)
  // ============================================================

  async findByOrganization(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async createInOrganization(organizationId: string, data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
    reason?: string;
  }, actor: any) {
    if (data.role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Seul un super-administrateur peut créer ce rôle.');
    }
    const reason = this.audit.normalizeReason(data.reason, data.role === UserRole.SUPER_ADMIN);
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!organization) {
      throw new NotFoundException('Organisation introuvable');
    }

    const limits = getLimitsForLicense(organization.licenseType);
    if (limits.maxUsers !== null) {
      const currentCount = await this.prisma.user.count({ where: { organizationId } });
      if (currentCount >= limits.maxUsers) {
        throw new ForbiddenException(
          `Votre licence ${organization.licenseType} est limitée à ${limits.maxUsers} utilisateur(s). Contactez CORO pour mettre à niveau.`
        );
      }
    }

    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec ce courriel.');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const newUser = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email: data.email, password: hashedPassword, firstName: data.firstName, lastName: data.lastName, role: data.role || UserRole.OPERATOR, organizationId },
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId, action: 'PLATFORM_USER_CREATED', targetType: 'User', targetId: created.id,
        targetLabel: created.email, organizationId, reason,
        afterData: { role: created.role, active: true },
      });
      return created;
    });

    // Envoyer le courriel de bienvenue avec le mot de passe temporaire
    try {
      await this.emailService.sendWelcomeTeamMember({
        toEmail: data.email,
        toFirstName: data.firstName,
        toLastName: data.lastName,
        organizationName: organization.name,
        temporaryPassword: data.password,
        loginUrl: 'https://app.getcoro.io/login',
      });
    } catch (err) {
      console.error('Erreur envoi courriel bienvenue:', err);
      // Ne pas bloquer la création si l'email échoue
    }

    return newUser;
  }
  async resendInvite(userId: string, newPassword: string, organizationId: string) {
    const u = await this.prisma.user.findFirst({ where: { id: userId, organizationId } });
    if (!u) throw new NotFoundException('Utilisateur introuvable');

    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId } });

    // Réinitialiser le mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { password: hashedPassword, authVersion: { increment: 1 } } }),
      this.prisma.refreshToken.updateMany({ where: { userId }, data: { isRevoked: true } }),
      this.prisma.trustedDevice.deleteMany({ where: { userId } }),
      this.prisma.platformMfaChallenge.deleteMany({ where: { userId } }),
    ]);

    // Renvoyer le courriel
    try {
      await this.emailService.sendWelcomeTeamMember({
        toEmail: u.email,
        toFirstName: u.firstName,
        toLastName: u.lastName,
        organizationName: organization?.name || 'CORO',
        temporaryPassword: newPassword,
        loginUrl: 'https://app.getcoro.io/login',
      });
    } catch (err) {
      console.error('Erreur envoi courriel renvoi invitation:', err);
    }

    return { success: true };
  }

  async toggleActiveInOrganization(userId: string, organizationId: string, isActive: boolean, actor: any, rawReason?: string) {
    if (userId === actor.userId && !isActive) throw new ForbiddenException('Vous ne pouvez pas désactiver votre propre compte.');
    const reason = this.audit.normalizeReason(rawReason, !isActive);
    const user = await this.prisma.user.findFirst({ where: { id: userId, organizationId } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable dans cette organisation.');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(11223344)`;
      if (!isActive && user.role === UserRole.SUPER_ADMIN) {
        const remaining = await tx.user.count({ where: { role: UserRole.SUPER_ADMIN, isActive: true, id: { not: userId } } });
        if (remaining === 0) throw new ForbiddenException('Le dernier super-administrateur actif ne peut pas être désactivé.');
      }
      const updated = await tx.user.update({ where: { id: userId }, data: { isActive, authVersion: { increment: 1 } }, select: { id: true, email: true, isActive: true } });
      await tx.refreshToken.updateMany({ where: { userId }, data: { isRevoked: true } });
      await tx.trustedDevice.deleteMany({ where: { userId } });
      await this.audit.record(tx, {
        actorUserId: actor.userId, action: isActive ? 'PLATFORM_USER_ENABLED' : 'PLATFORM_USER_DISABLED', targetType: 'User', targetId: userId,
        targetLabel: user.email, organizationId, reason,
        beforeData: { active: user.isActive, role: user.role }, afterData: { active: isActive, role: user.role },
      });
      return updated;
    });
  }
}
