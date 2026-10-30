import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CorrectiveActionPermission,
  IncidentPermission,
  OperationalReviewPermission,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../client-portal/email.service';
import * as bcrypt from 'bcryptjs';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { ClientInvitationOutboxService } from './client-invitation-outbox.service';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private adminAudit: AdminAuditService,
    private invitationOutbox: ClientInvitationOutboxService,
  ) {}

  async findAll(organizationId: string) {
    return this.prisma.client.findMany({
      where: { isActive: true, organizationId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { buildings: true, projects: true } } },
    });
  }

  async findOne(id: string, organizationId: string) {
    return this.prisma.client.findFirst({
      where: { id, organizationId },
      include: { buildings: true, projects: true },
    });
  }

  async findClientUsers(clientId: string, actor: any) {
    this.assertOrganizationAdmin(actor);
    await this.assertOwnership(clientId, actor.organizationId);
    return this.findClientUsersInOrganization(clientId, actor.organizationId);
  }

  async findPlatformClients(organizationId: string, actor: any) {
    this.assertSuperAdmin(actor);
    await this.assertOrganizationExists(organizationId);
    return this.prisma.client.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        city: true,
        province: true,
        isActive: true,
        createdAt: true,
        _count: { select: { buildings: true, clientUsers: true } },
      },
    });
  }

  async findPlatformOrganizationClientUsers(
    organizationId: string,
    actor: any,
  ) {
    this.assertSuperAdmin(actor);
    await this.assertOrganizationExists(organizationId);
    return this.prisma.clientUser.findMany({
      where: { organizationId },
      orderBy: [{ client: { name: 'asc' } }, { lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        buildingIds: true,
        operationalReviewPermissions: true,
        correctiveActionPermissions: true,
        incidentPermissions: true,
        client: { select: { id: true, name: true } },
      },
    });
  }

  async findPlatformClient(
    organizationId: string,
    clientId: string,
    actor: any,
  ) {
    this.assertSuperAdmin(actor);
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, organizationId },
      select: {
        id: true,
        name: true,
        city: true,
        province: true,
        isActive: true,
        organization: { select: { id: true, name: true } },
        _count: { select: { buildings: true, clientUsers: true } },
      },
    });
    if (!client) throw new NotFoundException('Client introuvable.');
    return client;
  }

  async findPlatformClientUsers(
    organizationId: string,
    clientId: string,
    actor: any,
  ) {
    this.assertSuperAdmin(actor);
    await this.assertOwnership(clientId, organizationId);
    return this.findClientUsersInOrganization(clientId, organizationId);
  }

  async getPlatformClientUserOperationalPermissions(
    organizationId: string,
    clientId: string,
    clientUserId: string,
    actor: any,
  ) {
    this.assertSuperAdmin(actor);
    const user = await this.findScopedClientUser(
      clientId,
      clientUserId,
      organizationId,
    );
    return this.toOperationalPermissionResponse(user);
  }

  private findClientUsersInOrganization(clientId: string, organizationId: string) {
    return this.prisma.clientUser.findMany({
      where: { clientId, organizationId },
      orderBy: [{ isActive: 'desc' }, { lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        buildingIds: true,
        operationalReviewPermissions: true,
        correctiveActionPermissions: true,
        incidentPermissions: true,
      },
    });
  }

  async getClientUserOperationalPermissions(
    clientId: string,
    clientUserId: string,
    actor: any,
  ) {
    this.assertOrganizationAdmin(actor);
    const user = await this.findScopedClientUser(
      clientId,
      clientUserId,
      actor.organizationId,
    );
    return this.toOperationalPermissionResponse(user);
  }

  async updateClientUserOperationalPermissions(
    clientId: string,
    clientUserId: string,
    data: {
      operationalReviewPermissions?: OperationalReviewPermission[];
      correctiveActionPermissions?: CorrectiveActionPermission[];
      incidentPermissions?: IncidentPermission[];
    },
    actor: any,
  ) {
    this.assertOrganizationAdmin(actor);
    return this.updateOperationalPermissionsInOrganization(
      actor.organizationId,
      clientId,
      clientUserId,
      data,
      actor,
    );
  }

  async updatePlatformClientUserOperationalPermissions(
    organizationId: string,
    clientId: string,
    clientUserId: string,
    data: {
      operationalReviewPermissions?: OperationalReviewPermission[];
      correctiveActionPermissions?: CorrectiveActionPermission[];
      incidentPermissions?: IncidentPermission[];
    },
    actor: any,
  ) {
    this.assertSuperAdmin(actor);
    return this.updateOperationalPermissionsInOrganization(
      organizationId,
      clientId,
      clientUserId,
      data,
      actor,
    );
  }

  private async updateOperationalPermissionsInOrganization(
    organizationId: string,
    clientId: string,
    clientUserId: string,
    data: {
      operationalReviewPermissions?: OperationalReviewPermission[];
      correctiveActionPermissions?: CorrectiveActionPermission[];
      incidentPermissions?: IncidentPermission[];
    },
    actor: any,
  ) {
    if (
      data.operationalReviewPermissions === undefined &&
      data.correctiveActionPermissions === undefined &&
      data.incidentPermissions === undefined
    ) {
      throw new BadRequestException('Au moins une liste de permissions est requise.');
    }

    const current = await this.findScopedClientUser(
      clientId,
      clientUserId,
      organizationId,
    );
    const nextReview =
      data.operationalReviewPermissions ?? current.operationalReviewPermissions;
    const nextCorrective =
      data.correctiveActionPermissions ?? current.correctiveActionPermissions;
    const nextIncident = data.incidentPermissions ?? current.incidentPermissions;

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.clientUser.update({
        where: { id: clientUserId },
        data: {
          operationalReviewPermissions: nextReview,
          correctiveActionPermissions: nextCorrective,
          incidentPermissions: nextIncident,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          buildingIds: true,
          operationalReviewPermissions: true,
          correctiveActionPermissions: true,
          incidentPermissions: true,
        },
      });
        await tx.auditLog.create({
        data: {
          action: 'CLIENT_USER_OPERATIONAL_PERMISSIONS_UPDATED',
          entityType: 'ClientUser',
          entityId: clientUserId,
          description: 'Permissions operationnelles du compte client mises a jour.',
          userId: actor.userId,
          organizationId,
          metadata: {
            actorRole: actor.role,
            actorOrganizationId: actor.organizationId,
            targetOrganizationId: organizationId,
            targetClientId: clientId,
            targetClientUserId: clientUserId,
            previous: {
              operationalReviewPermissions: current.operationalReviewPermissions,
              correctiveActionPermissions: current.correctiveActionPermissions,
              incidentPermissions: current.incidentPermissions,
            },
            next: {
              operationalReviewPermissions: nextReview,
              correctiveActionPermissions: nextCorrective,
              incidentPermissions: nextIncident,
            },
          },
          },
        });
        await this.adminAudit.record(tx, {
          actorUserId: actor.userId,
          action: 'CLIENT_USER_OPERATIONAL_PERMISSIONS_CHANGED',
          targetType: 'ClientUser',
          targetId: clientUserId,
          targetLabel: current.email,
          organizationId,
          beforeData: { operationalReviewPermissions: current.operationalReviewPermissions, correctiveActionPermissions: current.correctiveActionPermissions, incidentPermissions: current.incidentPermissions },
          afterData: { operationalReviewPermissions: nextReview, correctiveActionPermissions: nextCorrective, incidentPermissions: nextIncident },
        });
      return user;
    });
    return this.toOperationalPermissionResponse(updated);
  }

  async create(
    data: CreateClientDto & { organizationId: string },
    actor: { userId: string; role: string; organizationId: string },
    rawIdempotencyKey?: string,
  ) {
    this.assertOrganizationAdmin(actor);
    if (actor.organizationId !== data.organizationId) throw new ForbiddenException('Accès refusé.');
    const idempotencyKey = rawIdempotencyKey?.trim() || '';
    if (!/^[A-Za-z0-9_-]{16,100}$/.test(idempotencyKey)) throw new BadRequestException('Une clé d’idempotence valide est requise.');
    const normalized = {
      name: data.name.trim(), email: data.email?.trim() || null, phone: data.phone?.trim() || null,
      address: data.address?.trim() || null, city: data.city?.trim() || null,
      province: data.province?.trim() || null, logoBase64: data.logoBase64 || null,
      contactFirstName: data.contactFirstName?.trim() || null,
      contactLastName: data.contactLastName?.trim() || null,
      contactEmail: data.contactEmail?.trim().toLowerCase() || null,
      contactPhone: data.contactPhone?.trim() || null,
    };
    const payloadHash = createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
    const temporaryPassword = normalized.contactEmail ? `${randomBytes(12).toString('base64url')}A1!` : null;
    const hashedPassword = temporaryPassword ? await bcrypt.hash(temporaryPassword, 10) : null;
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${data.organizationId}:${actor.userId}:${idempotencyKey}`}, 0))`;
      const replay = await tx.clientProvisioningRequest.findUnique({
        where: { organizationId_actorUserId_idempotencyKey: { organizationId: data.organizationId, actorUserId: actor.userId, idempotencyKey } },
        include: { client: true },
      });
      if (replay) {
        if (replay.payloadHash !== payloadHash) throw new ConflictException('Cette clé d’idempotence appartient à une demande incompatible.');
        return replay.client;
      }
      if (normalized.contactEmail && await tx.clientUser.findUnique({ where: { email: normalized.contactEmail } })) {
        throw new BadRequestException('Cette adresse est déjà associée à un accès portail. Utilisez la gestion des accès existants.');
      }
      const organization = await tx.organization.findUnique({ where: { id: data.organizationId }, select: { name: true } });
      if (!organization) throw new BadRequestException('Organisation introuvable.');
      const client = await tx.client.create({ data: { ...normalized, organizationId: data.organizationId } });
      if (normalized.contactEmail && temporaryPassword && hashedPassword) {
        const clientUser = await tx.clientUser.create({ data: {
          email: normalized.contactEmail, password: hashedPassword,
          firstName: normalized.contactFirstName || '', lastName: normalized.contactLastName || '',
          role: 'CLIENT_CORPORATE', clientId: client.id, organizationId: data.organizationId,
        } });
        const eventKey = `client-invitation-${client.id}`;
        const protectedPayload = this.invitationOutbox.protect({
          toEmail: normalized.contactEmail,
          toName: `${normalized.contactFirstName || ''} ${normalized.contactLastName || ''}`.trim() || normalized.contactEmail,
          clientName: client.name, temporaryPassword, organizationName: organization.name,
        }, eventKey);
        await tx.clientInvitationEvent.create({ data: {
          organizationId: data.organizationId, clientId: client.id, clientUserId: clientUser.id,
          idempotencyKey: eventKey, ...protectedPayload,
        } });
      }
      await tx.clientProvisioningRequest.create({ data: {
        organizationId: data.organizationId, actorUserId: actor.userId, idempotencyKey, payloadHash, clientId: client.id,
      } });
      return client;
    });
  }

  async createCorpoAccess(
    clientId: string,
    organizationId: string,
    email: string,
    firstName: string,
    lastName: string,
    clientName: string,
  ) {
    // Vérifier si le compte existe déjà
    const existing = await this.prisma.clientUser.findUnique({ where: { email } });
    if (existing) return existing;

    // Générer mot de passe temporaire
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const clientUser = await this.prisma.clientUser.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'CLIENT_CORPORATE',
        clientId,
        organizationId,
      },
    });

    // Récupérer le nom de l'organisation
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });

    // Envoyer email d'invitation FR
    await this.emailService.sendClientInvitation({
      toEmail: email,
      toName: `${firstName} ${lastName}`.trim() || email,
      clientName,
      temporaryPassword: tempPassword,
      organizationName: org?.name || 'CORO',
    });

    return clientUser;
  }

  async update(id: string, data: UpdateClientDto, organizationId: string) {
    await this.assertOwnership(id, organizationId);

    // Récupérer l'ancien contact avant la mise à jour
    const oldClient = await this.prisma.client.findUnique({ where: { id } });
    const oldEmail = oldClient?.contactEmail;
    const newEmail = data.contactEmail;

    const updateData = {
      name: data.name, email: data.email, phone: data.phone, address: data.address,
      city: data.city, province: data.province,
      contactFirstName: data.contactFirstName, contactLastName: data.contactLastName,
      contactEmail: data.contactEmail, contactPhone: data.contactPhone,
    };
    const updated = await this.prisma.client.update({ where: { id }, data: updateData });

    // Si le contact corporatif a changé
    if (newEmail && newEmail !== oldEmail) {
      // Désactiver l'ancien compte CLIENT_CORPORATE
      if (oldEmail) {
        const oldUser = await this.prisma.clientUser.findUnique({ where: { email: oldEmail } });
        if (oldUser && oldUser.clientId === id) {
          await this.prisma.clientUser.update({
            where: { email: oldEmail },
            data: { isActive: false },
          });
        }
      }

      // Créer le nouveau compte CLIENT_CORPORATE
      const existing = await this.prisma.clientUser.findUnique({ where: { email: newEmail } });
      if (!existing) {
        await this.createCorpoAccess(
          id,
          organizationId,
          newEmail,
          data.contactFirstName || '',
          data.contactLastName || '',
          updated.name,
        );
      }
    }

    return updated;
  }

  async uploadLogo(id: string, logoBase64: string | null | undefined, organizationId: string) {
    await this.assertOwnership(id, organizationId);
    return this.prisma.client.update({
      where: { id },
      data: { logoBase64 },
    });
  }

  async remove(
    id: string,
    organizationId: string,
    actor: { userId: string; role: string; organizationId: string },
  ) {
    this.assertOrganizationAdmin(actor);
    if (actor.organizationId !== organizationId) throw new ForbiddenException('Accès refusé.');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Client" WHERE id = ${id} AND "organizationId" = ${organizationId} FOR UPDATE`;
      const client = await tx.client.findFirst({
        where: { id, organizationId },
        include: { clientUsers: { select: { id: true } } },
      });
      if (!client) throw new ForbiddenException('Accès refusé à cette ressource.');
      if (!client.isActive) return client;
      const userIds = client.clientUsers.map((user) => user.id);
      const now = new Date();
      const updated = await tx.client.update({ where: { id }, data: { isActive: false } });
      if (userIds.length > 0) {
        await tx.clientUser.updateMany({
          where: { id: { in: userIds } },
          data: { sessionVersion: { increment: 1 }, mfaCode: null, mfaCodeExpiry: null },
        });
        await tx.clientTrustedDevice.deleteMany({ where: { userId: { in: userIds } } });
        await tx.magicLink.updateMany({ where: { userId: { in: userIds }, usedAt: null }, data: { usedAt: now } });
        await tx.clientPasswordResetToken.updateMany({ where: { clientUserId: { in: userIds }, usedAt: null }, data: { usedAt: now } });
      }
      await tx.clientInvitationEvent.updateMany({
        where: { clientId: id, status: { in: ['PENDING', 'PROCESSING', 'FAILED'] } },
        data: { status: 'CANCELLED', nextAttemptAt: null, leaseExpiresAt: null, lastErrorCode: 'CLIENT_INACTIVE' },
      });
      await this.adminAudit.record(tx, {
        actorUserId: actor.userId,
        action: 'CLIENT_DEACTIVATED',
        targetType: 'Client',
        targetId: id,
        targetLabel: client.name,
        organizationId,
        beforeData: { isActive: true },
        afterData: { isActive: false, portalAccessSuspended: true },
      });
      return updated;
    });
  }

  async reactivate(
    id: string,
    organizationId: string,
    actor: { userId: string; role: string; organizationId: string },
  ) {
    this.assertOrganizationAdmin(actor);
    if (actor.organizationId !== organizationId) throw new ForbiddenException('Accès refusé.');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Client" WHERE id = ${id} AND "organizationId" = ${organizationId} FOR UPDATE`;
      const client = await tx.client.findFirst({ where: { id, organizationId } });
      if (!client) throw new ForbiddenException('Accès refusé à cette ressource.');
      if (client.isActive) return client;
      const updated = await tx.client.update({ where: { id }, data: { isActive: true } });
      await this.adminAudit.record(tx, {
        actorUserId: actor.userId,
        action: 'CLIENT_REACTIVATED',
        targetType: 'Client',
        targetId: id,
        targetLabel: client.name,
        organizationId,
        beforeData: { isActive: false },
        afterData: { isActive: true, priorSessionsRestored: false, priorLinksRestored: false },
      });
      return updated;
    });
  }

  private async assertOwnership(id: string, organizationId: string) {
    const client = await this.prisma.client.findFirst({ where: { id, organizationId } });
    if (!client) {
      throw new ForbiddenException('Accès refusé à cette ressource.');
    }
  }

  private assertSuperAdmin(actor: any) {
    if (actor?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Acces reserve aux super administrateurs.');
    }
  }

  private assertOrganizationAdmin(actor: any) {
    if (actor?.role !== 'ADMIN' && actor?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Acces reserve aux administrateurs.');
    }
  }

  private async assertOrganizationExists(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });
    if (!organization) throw new NotFoundException('Organisation introuvable.');
  }

  private async findScopedClientUser(
    clientId: string,
    clientUserId: string,
    organizationId: string,
  ) {
    const user = await this.prisma.clientUser.findFirst({
      where: { id: clientUserId, clientId, organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        buildingIds: true,
        operationalReviewPermissions: true,
        correctiveActionPermissions: true,
        incidentPermissions: true,
      },
    });
    if (!user) throw new NotFoundException('Utilisateur client introuvable.');
    return user;
  }

  private toOperationalPermissionResponse(user: any) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      buildingIds: user.buildingIds,
      operationalReviewPermissions: user.operationalReviewPermissions,
      correctiveActionPermissions: user.correctiveActionPermissions,
      incidentPermissions: user.incidentPermissions,
    };
  }
}
