import { Injectable, ConflictException, NotFoundException, ForbiddenException, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../client-portal/email.service';
import * as bcrypt from 'bcryptjs';
import { getLimitsForLicense } from '../organizations/license-limits';
import { assertIanaTimeZone } from '../bookings/booking-time';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { UserRole } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { OrganizationUserInvitationOutboxService } from './organization-user-invitation-outbox.service';

export type UpdateMeDto = Partial<{
  firstName: string; lastName: string; email: string; horaireBase: number;
  companyName: string | null; companyPhone: string | null; companyEmail: string | null;
  companyAddress: string | null; companyWebsite: string | null;
  companyTagline: string | null; companyLicense: string | null;
}>;
const SELF_FIELDS = new Set(['firstName', 'lastName', 'email', 'horaireBase']);
const hashOneTimeToken = (token: string) => createHash('sha256').update(token, 'utf8').digest('hex');

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    @Optional() private adminAudit?: AdminAuditService,
    private invitationOutbox?: OrganizationUserInvitationOutboxService,
  ) {}

  private get audit(): AdminAuditService {
    if (!this.adminAudit) throw new Error('AdminAuditService is required for administrative user mutations.');
    return this.adminAudit;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true,
        displayPermissions: true,
        displayBuildingIds: true,
        isActive: true,
        horaireBase: true,
        timeZone: true,
        timeZoneVerified: true,
        organization: { select: {
          companyName: true, companyLogoB64: true, companyLogoFullB64: true,
          companyPhone: true, companyEmail: true, companyAddress: true,
          companyWebsite: true, companyTagline: true, companyLicense: true,
        } },
      },
    });
    if (!user) return null;
    const { organization, ...personal } = user;
    return { ...personal, ...organization };
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
      if (!SELF_FIELDS.has(key)) throw new BadRequestException(`Champ de profil interdit : ${key}`);
      if (key === 'horaireBase') {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 168) throw new BadRequestException('Horaire de base invalide');
      } else if (typeof value !== 'string') {
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

  async updateOrganizationLogo(organizationId: string, actor: any, field: 'companyLogoB64' | 'companyLogoFullB64', value: string | null) {
    if (value !== null && (typeof value !== 'string' || value.length > 3_000_000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value))) {
      throw new BadRequestException('Logo invalide');
    }
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.organization.findUnique({ where: { id: organizationId }, select: { [field]: true } });
      if (!before) throw new NotFoundException('Organisation introuvable');
      const updated = await tx.organization.update({ where: { id: organizationId }, data: { [field]: value }, select: { id: true, [field]: true } });
      await this.audit.record(tx, { actorUserId: actor.userId, action: 'ORGANIZATION_LOGO_UPDATED', targetType: 'Organization', targetId: organizationId, organizationId, beforeData: before as any, afterData: { [field]: value ? '[IMAGE]' : null } });
      return updated;
    });
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

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    if (!currentPassword || typeof currentPassword !== 'string') throw new BadRequestException('Le mot de passe actuel est requis.');
    this.validatePasswordStrength(newPassword);
    const existing = await this.prisma.user.findUnique({ where: { id }, select: { password: true, isActive: true } });
    if (!existing?.isActive || !(await bcrypt.compare(currentPassword, existing.password))) {
      throw new ForbiddenException('Le mot de passe actuel est incorrect.');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id }, data: { password: hashedPassword, authVersion: { increment: 1 } }, select: { id: true } });
      await tx.refreshToken.updateMany({ where: { userId: id }, data: { isRevoked: true } });
      await tx.trustedDevice.deleteMany({ where: { userId: id } });
      await tx.platformMfaChallenge.deleteMany({ where: { userId: id } });
      await this.audit.record(tx, { actorUserId: id, action: 'USER_PASSWORD_CHANGED', targetType: 'User', targetId: id, organizationId: undefined, afterData: { sessionsRevoked: true, trustedDevicesRevoked: true } });
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

  async getDashboardSummary(organizationId: string) {
    const activeOperatorCount = await this.prisma.user.count({
      where: { organizationId, role: UserRole.OPERATOR, isActive: true },
    });
    return { activeOperatorCount };
  }

  async createInOrganization(organizationId: string, data: {
    email: string;
    password?: string; // ignored; retained only for compatibility with older trusted callers
    firstName: string;
    lastName: string;
    role?: UserRole;
    reason?: string;
    requestId?: string;
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

    if (!this.invitationOutbox) throw new Error('OrganizationUserInvitationOutboxService is required.');
    const idempotencyKey = `organization-user-create:${organizationId}:${data.requestId?.trim() || randomUUID()}`;
    const previous = await this.prisma.organizationUserInvitationEvent.findUnique({ where: { idempotencyKey }, include: { user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } } } });
    if (previous) return { ...previous.user, invitationStatus: previous.status };
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec ce courriel.');
    }
    const activationToken = randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(randomBytes(48).toString('base64url'), 10);
    const protectedEnvelope = this.invitationOutbox.protect({
      toEmail: data.email, toFirstName: data.firstName, toLastName: data.lastName,
      organizationName: organization.name,
      activationUrl: `https://app.getcoro.io/reset-password?token=${activationToken}`,
    }, idempotencyKey);
    let newUser;
    try {
      newUser = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${idempotencyKey}))`;
        const replay = await tx.organizationUserInvitationEvent.findUnique({
          where: { idempotencyKey },
          include: { user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } } },
        });
        if (replay) return replay.user;
        const conflictingUser = await tx.user.findUnique({ where: { email: data.email }, select: { id: true } });
        if (conflictingUser) throw new ConflictException('Un compte existe déjà avec ce courriel.');
        const created = await tx.user.create({
          data: { email: data.email, password: hashedPassword, firstName: data.firstName, lastName: data.lastName, role: data.role || UserRole.OPERATOR, organizationId, resetToken: hashOneTimeToken(activationToken), resetTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) },
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        });
        await tx.organizationUserInvitationEvent.create({ data: { organizationId, userId: created.id, idempotencyKey, ...protectedEnvelope } });
        await this.audit.record(tx, {
          actorUserId: actor.userId, action: 'PLATFORM_USER_CREATED', targetType: 'User', targetId: created.id,
          targetLabel: created.email, organizationId, reason,
          afterData: { role: created.role, active: true, invitationStatus: 'PENDING' },
        });
        return created;
      });
    } catch (error: unknown) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictException('Un compte existe déjà avec ce courriel.');
      }
      throw error;
    }

    return { ...newUser, invitationStatus: 'PENDING' };
  }
  async resendInvite(userId: string, organizationId: string, actor: any, requestId?: string) {
    const u = await this.prisma.user.findFirst({ where: { id: userId, organizationId } });
    if (!u) throw new NotFoundException('Utilisateur introuvable');

    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId } });

    if (!u.isActive || !organization?.isActive) throw new ForbiddenException('Le destinataire de cette invitation est inactif.');
    if (!this.invitationOutbox) throw new Error('OrganizationUserInvitationOutboxService is required.');
    const idempotencyKey = `organization-user-resend:${organizationId}:${userId}:${requestId?.trim() || randomUUID()}`;
    const previous = await this.prisma.organizationUserInvitationEvent.findUnique({ where: { idempotencyKey }, select: { id: true, status: true } });
    if (previous) return { success: true, invitationId: previous.id, status: previous.status };
    const activationToken = randomBytes(32).toString('hex');
    const protectedEnvelope = this.invitationOutbox.protect({ toEmail: u.email, toFirstName: u.firstName, toLastName: u.lastName, organizationName: organization.name, activationUrl: `https://app.getcoro.io/reset-password?token=${activationToken}` }, idempotencyKey);
    const event = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${idempotencyKey}))`;
      const replay = await tx.organizationUserInvitationEvent.findUnique({ where: { idempotencyKey } });
      if (replay) return replay;
      await tx.organizationUserInvitationEvent.updateMany({ where: { userId, status: { in: ['PENDING', 'FAILED', 'PROCESSING'] } }, data: { status: 'CANCELLED', nextAttemptAt: null, leaseExpiresAt: null, lastErrorCode: 'SUPERSEDED' } });
      await tx.user.update({ where: { id: userId }, data: { resetToken: hashOneTimeToken(activationToken), resetTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
      const created = await tx.organizationUserInvitationEvent.create({ data: { organizationId, userId, idempotencyKey, ...protectedEnvelope } });
      await this.audit.record(tx, { actorUserId: actor.userId, action: 'PLATFORM_USER_INVITATION_QUEUED', targetType: 'User', targetId: userId, targetLabel: u.email, organizationId, afterData: { invitationId: created.id, status: created.status } });
      return created;
    });
    return { success: true, invitationId: event.id, status: event.status };
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
      if (!isActive) {
        await tx.user.update({ where: { id: userId }, data: { resetToken: null, resetTokenExpiry: null } });
        await tx.organizationUserInvitationEvent.updateMany({
          where: { userId, status: { in: ['PENDING', 'FAILED', 'PROCESSING'] } },
          data: { status: 'CANCELLED', nextAttemptAt: null, leaseExpiresAt: null, lastErrorCode: 'RECIPIENT_INELIGIBLE' },
        });
      }
      await this.audit.record(tx, {
        actorUserId: actor.userId, action: isActive ? 'PLATFORM_USER_ENABLED' : 'PLATFORM_USER_DISABLED', targetType: 'User', targetId: userId,
        targetLabel: user.email, organizationId, reason,
        beforeData: { active: user.isActive, role: user.role }, afterData: { active: isActive, role: user.role },
      });
      return updated;
    });
  }
}
