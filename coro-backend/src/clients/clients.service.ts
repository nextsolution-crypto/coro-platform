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
import {
  ADMINISTRABLE_INCIDENT_PERMISSIONS,
  GrantClientUserIncidentAuthorityDto,
  RevokeClientUserIncidentAuthorityDto,
  SetClientUserIncidentPermissionsDto,
} from './dto/incident-authorization.dto';

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
      orderBy: [
        { client: { name: 'asc' } },
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
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

  private findClientUsersInOrganization(
    clientId: string,
    organizationId: string,
  ) {
    return this.prisma.clientUser.findMany({
      where: { clientId, organizationId },
      orderBy: [
        { isActive: 'desc' },
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
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
      throw new BadRequestException(
        'Au moins une liste de permissions est requise.',
      );
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
          incidentPermissions: true,
        },
      });
      await tx.auditLog.create({
        data: {
          action: 'CLIENT_USER_OPERATIONAL_PERMISSIONS_UPDATED',
          entityType: 'ClientUser',
          entityId: clientUserId,
          description:
            'Permissions operationnelles du compte client mises a jour.',
          userId: actor.userId,
          organizationId,
          metadata: {
            actorRole: actor.role,
            actorOrganizationId: actor.organizationId,
            targetOrganizationId: organizationId,
            targetClientId: clientId,
            targetClientUserId: clientUserId,
            previous: {
              operationalReviewPermissions:
                current.operationalReviewPermissions,
              correctiveActionPermissions: current.correctiveActionPermissions,
            },
            next: {
              operationalReviewPermissions: nextReview,
              correctiveActionPermissions: nextCorrective,
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
        beforeData: {
          operationalReviewPermissions: current.operationalReviewPermissions,
          correctiveActionPermissions: current.correctiveActionPermissions,
        },
        afterData: {
          operationalReviewPermissions: nextReview,
          correctiveActionPermissions: nextCorrective,
        },
      });
      return user;
    });
    return this.toOperationalPermissionResponse(updated);
  }

  async getClientUserIncidentAuthorizations(
    clientId: string,
    clientUserId: string,
    actor: any,
  ) {
    this.assertOrganizationAdmin(actor);
    return this.getIncidentAuthorizationsInOrganization(
      actor.organizationId,
      clientId,
      clientUserId,
    );
  }

  async getPlatformClientUserIncidentAuthorizations(
    organizationId: string,
    clientId: string,
    clientUserId: string,
    actor: any,
  ) {
    this.assertSuperAdmin(actor);
    return this.getIncidentAuthorizationsInOrganization(
      organizationId,
      clientId,
      clientUserId,
    );
  }

  async setClientUserIncidentPermissions(
    clientId: string,
    clientUserId: string,
    data: SetClientUserIncidentPermissionsDto,
    actor: any,
  ) {
    this.assertOrganizationAdmin(actor);
    return this.setIncidentPermissionsInOrganization(
      actor.organizationId,
      clientId,
      clientUserId,
      data,
      actor,
    );
  }

  async setPlatformClientUserIncidentPermissions(
    organizationId: string,
    clientId: string,
    clientUserId: string,
    data: SetClientUserIncidentPermissionsDto,
    actor: any,
  ) {
    this.assertSuperAdmin(actor);
    return this.setIncidentPermissionsInOrganization(
      organizationId,
      clientId,
      clientUserId,
      data,
      actor,
    );
  }

  async grantClientUserIncidentAuthorization(
    clientId: string,
    clientUserId: string,
    data: GrantClientUserIncidentAuthorityDto,
    actor: any,
    idempotencyKey?: string,
  ) {
    this.assertOrganizationAdmin(actor);
    return this.grantIncidentAuthorizationInOrganization(
      actor.organizationId,
      clientId,
      clientUserId,
      data,
      actor,
      idempotencyKey,
    );
  }

  async grantPlatformClientUserIncidentAuthorization(
    organizationId: string,
    clientId: string,
    clientUserId: string,
    data: GrantClientUserIncidentAuthorityDto,
    actor: any,
    idempotencyKey?: string,
  ) {
    this.assertSuperAdmin(actor);
    return this.grantIncidentAuthorizationInOrganization(
      organizationId,
      clientId,
      clientUserId,
      data,
      actor,
      idempotencyKey,
    );
  }

  async revokeClientUserIncidentAuthorization(
    clientId: string,
    clientUserId: string,
    assignmentId: string,
    data: RevokeClientUserIncidentAuthorityDto,
    actor: any,
  ) {
    this.assertOrganizationAdmin(actor);
    return this.revokeIncidentAuthorizationInOrganization(
      actor.organizationId,
      clientId,
      clientUserId,
      assignmentId,
      data,
      actor,
    );
  }

  async revokePlatformClientUserIncidentAuthorization(
    organizationId: string,
    clientId: string,
    clientUserId: string,
    assignmentId: string,
    data: RevokeClientUserIncidentAuthorityDto,
    actor: any,
  ) {
    this.assertSuperAdmin(actor);
    return this.revokeIncidentAuthorizationInOrganization(
      organizationId,
      clientId,
      clientUserId,
      assignmentId,
      data,
      actor,
    );
  }

  private assertAdministrableIncidentPermissions(
    permissions: IncidentPermission[],
  ) {
    if (
      permissions.some(
        (permission) =>
          !ADMINISTRABLE_INCIDENT_PERMISSIONS.includes(permission as any),
      )
    ) {
      throw new BadRequestException(
        'Permission Incident non administrable dans ce parcours.',
      );
    }
  }

  private normalizeIncidentPermissions(permissions: IncidentPermission[]) {
    this.assertAdministrableIncidentPermissions(permissions);
    return [...permissions].sort();
  }

  private async getIncidentAuthorizationsInOrganization(
    organizationId: string,
    clientId: string,
    clientUserId: string,
  ) {
    const user = await this.findScopedClientUser(
      clientId,
      clientUserId,
      organizationId,
    );
    const [buildings, unscopedAssignments] = await Promise.all([
      this.prisma.building.findMany({
        where: { organizationId, clientId, isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          incidentEvents: {
            where: { isActive: true },
            orderBy: { triggeredAt: 'desc' },
            select: { id: true, type: true, status: true, triggeredAt: true },
          },
        },
      }),
      this.prisma.incidentAuthorityAssignment.findMany({
        where: {
          organizationId,
          subjectType: 'CLIENT_USER',
          subjectId: clientUserId,
        },
        orderBy: [{ status: 'asc' }, { grantedAt: 'desc' }],
      }),
    ]);
    const buildingIds = new Set(buildings.map((building) => building.id));
    const assignments = unscopedAssignments.filter((assignment) =>
      buildingIds.has(assignment.buildingId),
    );
    const individual = new Set(user.incidentPermissions);
    const administrablePermissions = user.incidentPermissions.filter(
      (permission) =>
        ADMINISTRABLE_INCIDENT_PERMISSIONS.includes(permission as any),
    );
    return {
      user: {
        ...this.toOperationalPermissionResponse(user),
        incidentPermissions: administrablePermissions,
      },
      buildings: buildings.map(({ incidentEvents, ...building }) => ({
        ...building,
        incidents: incidentEvents,
      })),
      assignments: assignments.map((assignment) => ({
        ...assignment,
        effectivePermissions:
          assignment.status === 'ACTIVE' && user.isActive
            ? assignment.permissions.filter((permission) =>
                individual.has(permission),
              )
            : [],
      })),
      supportedDates: false,
    };
  }

  private async setIncidentPermissionsInOrganization(
    organizationId: string,
    clientId: string,
    clientUserId: string,
    data: SetClientUserIncidentPermissionsDto,
    actor: any,
  ) {
    const next = this.normalizeIncidentPermissions(data.permissions);
    const expected = this.normalizeIncidentPermissions(
      data.expectedPermissions,
    );
    const reason = this.adminAudit.normalizeReason(data.reason, true)!;
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`incident-authority:${organizationId}:${clientUserId}`}, 0))`;
      const user = await tx.clientUser.findFirst({
        where: { id: clientUserId, clientId, organizationId },
        select: {
          id: true,
          email: true,
          isActive: true,
          incidentPermissions: true,
        },
      });
      if (!user) throw new NotFoundException('Utilisateur client introuvable.');
      const current = this.normalizeIncidentPermissions(
        user.incidentPermissions.filter((permission) =>
          ADMINISTRABLE_INCIDENT_PERMISSIONS.includes(permission as any),
        ),
      );
      if (JSON.stringify(current) !== JSON.stringify(expected))
        throw new ConflictException(
          'Les permissions Incident ont ete modifiees. Rechargez avant de poursuivre.',
        );
      if (JSON.stringify(current) === JSON.stringify(next))
        return { incidentPermissions: current, replayed: true };
      const preserved = user.incidentPermissions.filter(
        (permission) =>
          !ADMINISTRABLE_INCIDENT_PERMISSIONS.includes(permission as any),
      );
      const persisted = [...preserved, ...next].sort();
      const updated = await tx.clientUser.update({
        where: { id: clientUserId },
        data: { incidentPermissions: persisted },
        select: { incidentPermissions: true },
      });
      await this.adminAudit.record(tx, {
        actorUserId: actor.userId,
        action: 'CLIENT_USER_INCIDENT_PERMISSIONS_CHANGED',
        targetType: 'ClientUser',
        targetId: clientUserId,
        targetLabel: user.email,
        organizationId,
        reason,
        beforeData: { incidentPermissions: current },
        afterData: { incidentPermissions: next },
      });
      return { ...updated, replayed: false };
    });
  }

  private async grantIncidentAuthorizationInOrganization(
    organizationId: string,
    clientId: string,
    clientUserId: string,
    data: GrantClientUserIncidentAuthorityDto,
    actor: any,
    rawIdempotencyKey?: string,
  ) {
    const idempotencyKey = rawIdempotencyKey?.trim() || '';
    if (!/^[A-Za-z0-9_-]{16,100}$/.test(idempotencyKey))
      throw new BadRequestException(
        'Une cle d idempotence valide est requise.',
      );
    const permissions = this.normalizeIncidentPermissions(data.permissions);
    const reason = this.adminAudit.normalizeReason(data.reason, true)!;
    const operationalRole = data.operationalRole.trim();
    if (!operationalRole || operationalRole.length > 120)
      throw new BadRequestException('Un role operationnel valide est requis.');
    const payload = {
      clientId,
      clientUserId,
      buildingId: data.buildingId,
      incidentEventId: data.incidentEventId ?? null,
      permissions,
      operationalRole,
      reason,
    };
    const payloadHash = createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`incident-authority:${organizationId}:${clientUserId}`}, 0))`;
      const replay = await tx.incidentAuthorityAssignment.findFirst({
        where: { organizationId, idempotencyKey },
      });
      if (replay) {
        if (replay.payloadHash !== payloadHash)
          throw new ConflictException(
            'Cette cle d idempotence appartient a une demande incompatible.',
          );
        return { assignment: replay, replayed: true };
      }
      const user = await tx.clientUser.findFirst({
        where: {
          id: clientUserId,
          clientId,
          organizationId,
          isActive: true,
          client: { isActive: true },
        },
        select: {
          id: true,
          email: true,
          role: true,
          buildingIds: true,
          incidentPermissions: true,
        },
      });
      if (!user)
        throw new NotFoundException('Utilisateur client actif introuvable.');
      const building = await tx.building.findFirst({
        where: {
          id: data.buildingId,
          clientId,
          organizationId,
          isActive: true,
        },
        select: { id: true, name: true },
      });
      if (!building)
        throw new NotFoundException(
          'Batiment actif introuvable dans ce client.',
        );
      if (
        user.role === 'CLIENT_MANAGER' &&
        !user.buildingIds.includes(building.id)
      )
        throw new ForbiddenException(
          'Le compte client n est pas affecte a ce batiment.',
        );
      if (data.incidentEventId) {
        const incident = await tx.incidentEvent.findFirst({
          where: {
            id: data.incidentEventId,
            buildingId: building.id,
            organizationId,
            isActive: true,
          },
          select: { id: true },
        });
        if (!incident)
          throw new NotFoundException(
            'Incident actif introuvable dans ce batiment.',
          );
      }
      const existing = await tx.incidentAuthorityAssignment.findFirst({
        where: {
          organizationId,
          buildingId: building.id,
          incidentEventId: data.incidentEventId ?? null,
          subjectType: 'CLIENT_USER',
          subjectId: clientUserId,
          status: 'ACTIVE',
        },
      });
      if (existing)
        throw new ConflictException(
          'Une affectation Incident active existe deja pour ce perimetre.',
        );
      const nextIndividual = Array.from(
        new Set([...user.incidentPermissions, ...permissions]),
      ).sort();
      await tx.clientUser.update({
        where: { id: clientUserId },
        data: { incidentPermissions: nextIndividual },
      });
      const assignment = await tx.incidentAuthorityAssignment.create({
        data: {
          organizationId,
          buildingId: building.id,
          incidentEventId: data.incidentEventId ?? null,
          subjectType: 'CLIENT_USER',
          subjectId: clientUserId,
          operationalRole,
          permissions,
          grantedByType: 'USER',
          grantedById: actor.userId,
          grantReason: reason,
          idempotencyKey,
          payloadHash,
        },
      });
      await this.adminAudit.record(tx, {
        actorUserId: actor.userId,
        action: 'CLIENT_USER_INCIDENT_AUTHORITY_GRANTED',
        targetType: 'IncidentAuthorityAssignment',
        targetId: assignment.id,
        targetLabel: user.email,
        organizationId,
        reason,
        beforeData: {
          incidentPermissions: user.incidentPermissions,
          assignment: null,
        },
        afterData: {
          incidentPermissions: nextIndividual,
          assignment: {
            id: assignment.id,
            buildingId: assignment.buildingId,
            incidentEventId: assignment.incidentEventId,
            permissions: assignment.permissions,
            operationalRole: assignment.operationalRole,
            status: assignment.status,
          },
        },
      });
      return {
        assignment,
        incidentPermissions: nextIndividual,
        replayed: false,
      };
    });
  }

  private async revokeIncidentAuthorizationInOrganization(
    organizationId: string,
    clientId: string,
    clientUserId: string,
    assignmentId: string,
    data: RevokeClientUserIncidentAuthorityDto,
    actor: any,
  ) {
    const reason = this.adminAudit.normalizeReason(data.reason, true)!;
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`incident-authority:${organizationId}:${clientUserId}`}, 0))`;
      const user = await tx.clientUser.findFirst({
        where: { id: clientUserId, clientId, organizationId },
        select: { id: true, email: true },
      });
      if (!user) throw new NotFoundException('Utilisateur client introuvable.');
      const assignment = await tx.incidentAuthorityAssignment.findFirst({
        where: {
          id: assignmentId,
          organizationId,
          subjectType: 'CLIENT_USER',
          subjectId: clientUserId,
        },
      });
      if (!assignment)
        throw new NotFoundException('Affectation Incident introuvable.');
      const scopedBuilding = await tx.building.findFirst({
        where: { id: assignment.buildingId, clientId, organizationId },
        select: { id: true },
      });
      if (!scopedBuilding)
        throw new NotFoundException(
          'Affectation Incident introuvable dans ce client.',
        );
      if (assignment.status === 'REVOKED') {
        if (
          assignment.revokedById === actor.userId &&
          assignment.revocationReason === reason
        )
          return { revoked: true, replayed: true };
        throw new ConflictException('Cette affectation est deja revoquee.');
      }
      const claimed = await tx.incidentAuthorityAssignment.updateMany({
        where: {
          id: assignmentId,
          organizationId,
          subjectType: 'CLIENT_USER',
          subjectId: clientUserId,
          status: 'ACTIVE',
          lockVersion: data.lockVersion,
        },
        data: {
          status: 'REVOKED',
          revokedByType: 'USER',
          revokedById: actor.userId,
          revokedAt: new Date(),
          revocationReason: reason,
          lockVersion: { increment: 1 },
        },
      });
      if (claimed.count !== 1)
        throw new ConflictException(
          'Affectation modifiee. Rechargez avant de poursuivre.',
        );
      const updated = await tx.incidentAuthorityAssignment.findUniqueOrThrow({
        where: { id: assignmentId },
      });
      await this.adminAudit.record(tx, {
        actorUserId: actor.userId,
        action: 'CLIENT_USER_INCIDENT_AUTHORITY_REVOKED',
        targetType: 'IncidentAuthorityAssignment',
        targetId: assignmentId,
        targetLabel: user.email,
        organizationId,
        reason,
        beforeData: {
          status: assignment.status,
          lockVersion: assignment.lockVersion,
        },
        afterData: { status: updated.status, lockVersion: updated.lockVersion },
      });
      return { revoked: true, replayed: false };
    });
  }

  async create(
    data: CreateClientDto & { organizationId: string },
    actor: { userId: string; role: string; organizationId: string },
    rawIdempotencyKey?: string,
  ) {
    this.assertOrganizationAdmin(actor);
    if (actor.organizationId !== data.organizationId)
      throw new ForbiddenException('Accès refusé.');
    const idempotencyKey = rawIdempotencyKey?.trim() || '';
    if (!/^[A-Za-z0-9_-]{16,100}$/.test(idempotencyKey))
      throw new BadRequestException(
        'Une clé d’idempotence valide est requise.',
      );
    const normalized = {
      name: data.name.trim(),
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
      city: data.city?.trim() || null,
      province: data.province?.trim() || null,
      logoBase64: data.logoBase64 || null,
      contactFirstName: data.contactFirstName?.trim() || null,
      contactLastName: data.contactLastName?.trim() || null,
      contactEmail: data.contactEmail?.trim().toLowerCase() || null,
      contactPhone: data.contactPhone?.trim() || null,
    };
    const payloadHash = createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex');
    const temporaryPassword = normalized.contactEmail
      ? `${randomBytes(12).toString('base64url')}A1!`
      : null;
    const hashedPassword = temporaryPassword
      ? await bcrypt.hash(temporaryPassword, 10)
      : null;
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${data.organizationId}:${actor.userId}:${idempotencyKey}`}, 0))`;
      const replay = await tx.clientProvisioningRequest.findUnique({
        where: {
          organizationId_actorUserId_idempotencyKey: {
            organizationId: data.organizationId,
            actorUserId: actor.userId,
            idempotencyKey,
          },
        },
        include: { client: true },
      });
      if (replay) {
        if (replay.payloadHash !== payloadHash)
          throw new ConflictException(
            'Cette clé d’idempotence appartient à une demande incompatible.',
          );
        return replay.client;
      }
      if (
        normalized.contactEmail &&
        (await tx.clientUser.findUnique({
          where: { email: normalized.contactEmail },
        }))
      ) {
        throw new BadRequestException(
          'Cette adresse est déjà associée à un accès portail. Utilisez la gestion des accès existants.',
        );
      }
      const organization = await tx.organization.findUnique({
        where: { id: data.organizationId },
        select: { name: true },
      });
      if (!organization)
        throw new BadRequestException('Organisation introuvable.');
      const client = await tx.client.create({
        data: { ...normalized, organizationId: data.organizationId },
      });
      if (normalized.contactEmail && temporaryPassword && hashedPassword) {
        const clientUser = await tx.clientUser.create({
          data: {
            email: normalized.contactEmail,
            password: hashedPassword,
            firstName: normalized.contactFirstName || '',
            lastName: normalized.contactLastName || '',
            role: 'CLIENT_CORPORATE',
            clientId: client.id,
            organizationId: data.organizationId,
          },
        });
        const eventKey = `client-invitation-${client.id}`;
        const protectedPayload = this.invitationOutbox.protect(
          {
            toEmail: normalized.contactEmail,
            toName:
              `${normalized.contactFirstName || ''} ${normalized.contactLastName || ''}`.trim() ||
              normalized.contactEmail,
            clientName: client.name,
            temporaryPassword,
            organizationName: organization.name,
          },
          eventKey,
        );
        await tx.clientInvitationEvent.create({
          data: {
            organizationId: data.organizationId,
            clientId: client.id,
            clientUserId: clientUser.id,
            idempotencyKey: eventKey,
            ...protectedPayload,
          },
        });
      }
      await tx.clientProvisioningRequest.create({
        data: {
          organizationId: data.organizationId,
          actorUserId: actor.userId,
          idempotencyKey,
          payloadHash,
          clientId: client.id,
        },
      });
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
    const existing = await this.prisma.clientUser.findUnique({
      where: { email },
    });
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
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

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
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      province: data.province,
      contactFirstName: data.contactFirstName,
      contactLastName: data.contactLastName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
    };
    const updated = await this.prisma.client.update({
      where: { id },
      data: updateData,
    });

    // Si le contact corporatif a changé
    if (newEmail && newEmail !== oldEmail) {
      // Désactiver l'ancien compte CLIENT_CORPORATE
      if (oldEmail) {
        const oldUser = await this.prisma.clientUser.findUnique({
          where: { email: oldEmail },
        });
        if (oldUser && oldUser.clientId === id) {
          await this.prisma.clientUser.update({
            where: { email: oldEmail },
            data: { isActive: false },
          });
        }
      }

      // Créer le nouveau compte CLIENT_CORPORATE
      const existing = await this.prisma.clientUser.findUnique({
        where: { email: newEmail },
      });
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

  async uploadLogo(
    id: string,
    logoBase64: string | null | undefined,
    organizationId: string,
  ) {
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
    if (actor.organizationId !== organizationId)
      throw new ForbiddenException('Accès refusé.');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Client" WHERE id = ${id} AND "organizationId" = ${organizationId} FOR UPDATE`;
      const client = await tx.client.findFirst({
        where: { id, organizationId },
        include: { clientUsers: { select: { id: true } } },
      });
      if (!client)
        throw new ForbiddenException('Accès refusé à cette ressource.');
      if (!client.isActive) return client;
      const userIds = client.clientUsers.map((user) => user.id);
      const now = new Date();
      const updated = await tx.client.update({
        where: { id },
        data: { isActive: false },
      });
      if (userIds.length > 0) {
        await tx.clientUser.updateMany({
          where: { id: { in: userIds } },
          data: {
            sessionVersion: { increment: 1 },
            mfaCode: null,
            mfaCodeExpiry: null,
          },
        });
        await tx.clientTrustedDevice.deleteMany({
          where: { userId: { in: userIds } },
        });
        await tx.magicLink.updateMany({
          where: { userId: { in: userIds }, usedAt: null },
          data: { usedAt: now },
        });
        await tx.clientPasswordResetToken.updateMany({
          where: { clientUserId: { in: userIds }, usedAt: null },
          data: { usedAt: now },
        });
      }
      await tx.clientInvitationEvent.updateMany({
        where: {
          clientId: id,
          status: { in: ['PENDING', 'PROCESSING', 'FAILED'] },
        },
        data: {
          status: 'CANCELLED',
          nextAttemptAt: null,
          leaseExpiresAt: null,
          lastErrorCode: 'CLIENT_INACTIVE',
        },
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
    if (actor.organizationId !== organizationId)
      throw new ForbiddenException('Accès refusé.');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Client" WHERE id = ${id} AND "organizationId" = ${organizationId} FOR UPDATE`;
      const client = await tx.client.findFirst({
        where: { id, organizationId },
      });
      if (!client)
        throw new ForbiddenException('Accès refusé à cette ressource.');
      if (client.isActive) return client;
      const updated = await tx.client.update({
        where: { id },
        data: { isActive: true },
      });
      await this.adminAudit.record(tx, {
        actorUserId: actor.userId,
        action: 'CLIENT_REACTIVATED',
        targetType: 'Client',
        targetId: id,
        targetLabel: client.name,
        organizationId,
        beforeData: { isActive: false },
        afterData: {
          isActive: true,
          priorSessionsRestored: false,
          priorLinksRestored: false,
        },
      });
      return updated;
    });
  }

  private async assertOwnership(id: string, organizationId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, organizationId },
    });
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
