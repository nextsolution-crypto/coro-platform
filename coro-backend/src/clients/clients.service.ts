import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CorrectiveActionPermission,
  OperationalReviewPermission,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../client-portal/email.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
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
    },
    actor: any,
  ) {
    if (
      data.operationalReviewPermissions === undefined &&
      data.correctiveActionPermissions === undefined
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

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.clientUser.update({
        where: { id: clientUserId },
        data: {
          operationalReviewPermissions: nextReview,
          correctiveActionPermissions: nextCorrective,
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
            },
            next: {
              operationalReviewPermissions: nextReview,
              correctiveActionPermissions: nextCorrective,
            },
          },
        },
      });
      return user;
    });
    return this.toOperationalPermissionResponse(updated);
  }

  async create(data: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    province?: string;
    logoBase64?: string;
    organizationId: string;
    contactFirstName?: string;
    contactLastName?: string;
    contactEmail?: string;
    contactPhone?: string;
  }) {
    const client = await this.prisma.client.create({ data });

    // Créer automatiquement le compte CLIENT_CORPORATE si email fourni
    if (data.contactEmail) {
      await this.createCorpoAccess(
        client.id,
        data.organizationId,
        data.contactEmail,
        data.contactFirstName || '',
        data.contactLastName || '',
        client.name,
      );
    }

    return client;
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

  async update(id: string, data: any, organizationId: string) {
    await this.assertOwnership(id, organizationId);

    // Récupérer l'ancien contact avant la mise à jour
    const oldClient = await this.prisma.client.findUnique({ where: { id } });
    const oldEmail = oldClient?.contactEmail;
    const newEmail = data.contactEmail;

    const updated = await this.prisma.client.update({ where: { id }, data });

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

  async uploadLogo(id: string, logoBase64: string, organizationId: string) {
    await this.assertOwnership(id, organizationId);
    return this.prisma.client.update({
      where: { id },
      data: { logoBase64 },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.assertOwnership(id, organizationId);
    return this.prisma.client.update({
      where: { id },
      data: { isActive: false },
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
    };
  }
}
