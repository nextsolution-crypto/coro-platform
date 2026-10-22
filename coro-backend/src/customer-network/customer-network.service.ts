import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { CustomerNetworkPermission, Prisma } from '@prisma/client';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PlatformAuthorityService } from '../auth/platform-authority.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddBuildingMembershipDto,
  BootstrapNetworkPortfolioDto,
  CreateNetworkAuthorityDraftDto,
  CreatePortfolioAssignmentDto,
  CreatePortfolioDto,
  CreateRegionDto,
  LinkRegionDto,
  PortfolioAnalyticsQueryDto,
  PortfolioQueryDto,
  SucceedPortfolioAssignmentDto,
} from './customer-network.dto';

type InternalActor = { userId: string };
type ClientActor = { sub: string; organizationId: string };

@Injectable()
export class CustomerNetworkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly platformIdentity: PlatformAuthorityService,
  ) {}

  private json(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private reason(value: string) {
    return this.audit.normalizeReason(value, true)!;
  }

  async createDraft(
    actor: InternalActor,
    organizationId: string,
    input: CreateNetworkAuthorityDraftDto,
  ) {
    await this.platformIdentity.requireFounderAuthority(actor);
    const reason = this.reason(input.reason);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`customer-network:${organizationId}`}, 0))`;
      const [existing, organization, responsible] = await Promise.all([
        tx.customerNetworkAuthorityConfiguration.findUnique({
          where: { organizationId },
        }),
        tx.organization.findUnique({
          where: { id: organizationId },
          select: { id: true, isActive: true, isInternal: true },
        }),
        tx.user.findUnique({
          where: { id: input.responsibleUserId },
          select: { id: true, organizationId: true, isActive: true },
        }),
      ]);
      if (existing)
        throw new ConflictException('Autorite Network deja configuree.');
      if (!organization?.isActive || organization.isInternal)
        throw new BadRequestException('Organisation cliente invalide.');
      if (
        !responsible?.isActive ||
        responsible.organizationId !== organizationId
      )
        throw new BadRequestException('Responsable initial invalide.');
      const created = await tx.customerNetworkAuthorityConfiguration.create({
        data: {
          organizationId,
          initialResponsibleUserId: responsible.id,
          responsibleUserId: responsible.id,
          mandateReference: input.mandateReference.trim(),
          creationReason: reason,
          createdByUserId: actor.userId,
        },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'CUSTOMER_NETWORK_AUTHORITY_DRAFT_CREATED',
        targetType: 'CustomerNetworkAuthorityConfiguration',
        targetId: created.id,
        organizationId,
        reason,
        afterData: this.json({
          status: created.status,
          responsibleUserId: created.responsibleUserId,
          mandateReference: created.mandateReference,
          lockVersion: created.lockVersion,
        }),
      });
      return created;
    });
  }

  async activate(
    actor: InternalActor,
    organizationId: string,
    lockVersion: number,
    rawReason: string,
  ) {
    await this.platformIdentity.requireFounderAuthority(actor);
    const reason = this.reason(rawReason);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`customer-network:${organizationId}`}, 0))`;
      const authority =
        await tx.customerNetworkAuthorityConfiguration.findUnique({
          where: { organizationId },
        });
      if (!authority || authority.status !== 'DRAFT')
        throw new ConflictException('Autorite Network non activable.');
      const [organization, responsible] = await Promise.all([
        tx.organization.findUnique({ where: { id: organizationId } }),
        tx.user.findUnique({ where: { id: authority.responsibleUserId } }),
      ]);
      if (
        !organization?.isActive ||
        organization.isInternal ||
        !responsible?.isActive ||
        responsible.organizationId !== organizationId
      )
        throw new ForbiddenException("Preconditions d'activation invalides.");
      const updated = await tx.customerNetworkAuthorityConfiguration.updateMany(
        {
          where: { id: authority.id, status: 'DRAFT', lockVersion },
          data: {
            status: 'ACTIVE',
            activatedByUserId: actor.userId,
            activatedAt: new Date(),
            activationReason: reason,
            lockVersion: { increment: 1 },
          },
        },
      );
      if (updated.count !== 1)
        throw new ConflictException("Conflit d'activation Network.");
      const active =
        await tx.customerNetworkAuthorityConfiguration.findUniqueOrThrow({
          where: { organizationId },
        });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'CUSTOMER_NETWORK_AUTHORITY_ACTIVATED',
        targetType: 'CustomerNetworkAuthorityConfiguration',
        targetId: active.id,
        organizationId,
        reason,
        afterData: this.json({
          status: active.status,
          lockVersion: active.lockVersion,
          responsibleUserId: active.responsibleUserId,
        }),
      });
      return active;
    });
  }

  async replaceResponsible(
    actor: InternalActor,
    organizationId: string,
    responsibleUserId: string,
    lockVersion: number,
    rawReason: string,
  ) {
    await this.platformIdentity.requireFounderAuthority(actor);
    const reason = this.reason(rawReason);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`customer-network:${organizationId}`}, 0))`;
      const [authority, responsible] = await Promise.all([
        tx.customerNetworkAuthorityConfiguration.findUnique({
          where: { organizationId },
        }),
        tx.user.findUnique({ where: { id: responsibleUserId } }),
      ]);
      if (!authority || authority.status !== 'ACTIVE')
        throw new ConflictException('Autorite Network inactive.');
      if (
        !responsible?.isActive ||
        responsible.organizationId !== organizationId
      )
        throw new BadRequestException('Responsable de remplacement invalide.');
      const changed = await tx.customerNetworkAuthorityConfiguration.updateMany(
        {
          where: { id: authority.id, status: 'ACTIVE', lockVersion },
          data: {
            responsibleUserId,
            lockVersion: { increment: 1 },
          },
        },
      );
      if (changed.count !== 1)
        throw new ConflictException('Conflit de remplacement Network.');
      const result =
        await tx.customerNetworkAuthorityConfiguration.findUniqueOrThrow({
          where: { organizationId },
        });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'CUSTOMER_NETWORK_RESPONSIBLE_REPLACED',
        targetType: 'CustomerNetworkAuthorityConfiguration',
        targetId: authority.id,
        organizationId,
        reason,
        beforeData: this.json({
          responsibleUserId: authority.responsibleUserId,
        }),
        afterData: this.json({
          responsibleUserId: result.responsibleUserId,
          lockVersion: result.lockVersion,
        }),
      });
      return result;
    });
  }

  async revokeAuthority(
    actor: InternalActor,
    organizationId: string,
    lockVersion: number,
    rawReason: string,
  ) {
    await this.platformIdentity.requireFounderAuthority(actor);
    const reason = this.reason(rawReason);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`customer-network:${organizationId}`}, 0))`;
      const authority =
        await tx.customerNetworkAuthorityConfiguration.findUnique({
          where: { organizationId },
        });
      if (!authority || authority.status !== 'ACTIVE')
        throw new ConflictException('Autorite Network non revocable.');
      const changed = await tx.customerNetworkAuthorityConfiguration.updateMany(
        {
          where: { id: authority.id, status: 'ACTIVE', lockVersion },
          data: {
            status: 'REVOKED',
            revokedByUserId: actor.userId,
            revokedAt: new Date(),
            revocationReason: reason,
            lockVersion: { increment: 1 },
          },
        },
      );
      if (changed.count !== 1)
        throw new ConflictException('Conflit de revocation Network.');
      await tx.customerPortfolioAssignment.updateMany({
        where: { organizationId, status: 'ACTIVE' },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revokedByActorType: 'INTERNAL_USER',
          revokedByUserId: actor.userId,
          revocationReason: 'Autorite Network revoquee',
          lockVersion: { increment: 1 },
        },
      });
      const result =
        await tx.customerNetworkAuthorityConfiguration.findUniqueOrThrow({
          where: { organizationId },
        });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'CUSTOMER_NETWORK_AUTHORITY_REVOKED',
        targetType: 'CustomerNetworkAuthorityConfiguration',
        targetId: authority.id,
        organizationId,
        reason,
        afterData: this.json({
          status: result.status,
          lockVersion: result.lockVersion,
        }),
      });
      return result;
    });
  }

  private async activeAuthority(organizationId: string) {
    const authority =
      await this.prisma.customerNetworkAuthorityConfiguration.findUnique({
        where: { organizationId },
      });
    if (!authority || authority.status !== 'ACTIVE')
      throw new ForbiddenException('Autorite Network inactive.');
    return authority;
  }

  private async requireInternalPermission(
    actor: InternalActor,
    organizationId: string,
    permission: CustomerNetworkPermission,
  ) {
    await this.activeAuthority(organizationId);
    const now = new Date();
    const assignment = await this.prisma.customerPortfolioAssignment.findFirst({
      where: {
        organizationId,
        subjectType: 'INTERNAL_USER',
        userId: actor.userId,
        status: 'ACTIVE',
        permissions: { has: permission },
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
      },
      select: { id: true },
    });
    if (!assignment)
      throw new ForbiddenException('Permission Network requise.');
  }

  private async validateAssignmentTarget(
    tx: Prisma.TransactionClient,
    organizationId: string,
    input: CreatePortfolioAssignmentDto,
  ) {
    const subject =
      input.subjectType === 'INTERNAL_USER'
        ? await tx.user.findFirst({
            where: { id: input.userId, organizationId, isActive: true },
            select: { id: true, organizationId: true },
          })
        : input.subjectType === 'CLIENT_USER'
          ? await tx.clientUser.findFirst({
              where: { id: input.clientUserId, organizationId, isActive: true },
              select: { id: true, organizationId: true },
            })
          : await tx.user.findFirst({
              where: {
                id: input.operatorUserId,
                isActive: true,
                organization: { isActive: true, isInternal: true },
                organizationId: {
                  not: organizationId,
                },
              },
              select: { id: true, organizationId: true },
            });
    if (!subject) throw new BadRequestException('Sujet Network invalide.');
    if (input.subjectType === 'OPERATOR_USER') {
      const authority = await tx.platformAuthorityConfiguration.findUnique({
        where: { id: 'PRIMARY' },
        select: { status: true, operatorOrganizationId: true },
      });
      if (
        authority?.status !== 'ACTIVE' ||
        subject.organizationId !== authority.operatorOrganizationId ||
        input.permissions.length !== 1 ||
        input.permissions[0] !== 'NETWORK_SUPERVISION_READ'
      )
        throw new ForbiddenException('Affectation operateur Network invalide.');
    }
    const targetId =
      input.scope === 'PORTFOLIO'
        ? input.portfolioId
        : input.scope === 'REGION'
          ? input.regionId
          : input.buildingId;
    if (!targetId) throw new BadRequestException('Cible Network requise.');
    const valid =
      input.scope === 'PORTFOLIO'
        ? await tx.customerPortfolio.findFirst({
            where: { id: targetId, organizationId, isActive: true },
          })
        : input.scope === 'REGION'
          ? await tx.customerPortfolioRegion.findFirst({
              where: { id: targetId, organizationId, isActive: true },
            })
          : await tx.building.findFirst({
              where: { id: targetId, organizationId, isActive: true },
            });
    if (!valid) throw new BadRequestException('Cible Network invalide.');
  }

  async bootstrapInitialPortfolio(
    actor: InternalActor,
    organizationId: string,
    input: BootstrapNetworkPortfolioDto,
  ) {
    const reason = this.reason(input.reason);
    const permissions = [...new Set(input.permissions)];
    if (
      !permissions.includes('NETWORK_HIERARCHY_MANAGE') ||
      !permissions.includes('NETWORK_ASSIGNMENT_MANAGE')
    )
      throw new BadRequestException(
        "Les permissions d'amorcage doivent inclure la gestion de la hierarchie et des affectations.",
      );

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`customer-network-bootstrap:${organizationId}`}, 0))`;
      const [
        authority,
        organization,
        responsible,
        portfolioCount,
        assignmentCount,
      ] = await Promise.all([
        tx.customerNetworkAuthorityConfiguration.findUnique({
          where: { organizationId },
        }),
        tx.organization.findUnique({
          where: { id: organizationId },
          select: { id: true, isActive: true, isInternal: true },
        }),
        tx.user.findFirst({
          where: { id: actor.userId, organizationId, isActive: true },
          select: { id: true },
        }),
        tx.customerPortfolio.count({ where: { organizationId } }),
        tx.customerPortfolioAssignment.count({ where: { organizationId } }),
      ]);
      if (!authority || authority.status !== 'ACTIVE')
        throw new ForbiddenException('Autorite Network inactive.');
      if (
        !organization?.isActive ||
        organization.isInternal ||
        !responsible ||
        authority.responsibleUserId !== actor.userId
      )
        throw new ForbiddenException(
          "Responsable d'amorcage Network invalide.",
        );
      if (portfolioCount !== 0 || assignmentCount !== 0)
        throw new ConflictException('Amorcage Network deja effectue.');

      const portfolio = await tx.customerPortfolio.create({
        data: {
          organizationId,
          code: input.code,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          createdByUserId: actor.userId,
        },
      });
      const assignment = await tx.customerPortfolioAssignment.create({
        data: {
          organizationId,
          subjectType: 'INTERNAL_USER',
          userId: actor.userId,
          scope: 'PORTFOLIO',
          portfolioId: portfolio.id,
          permissions,
          grantedByActorType: 'INTERNAL_USER',
          grantedByUserId: actor.userId,
          grantReason: reason,
        },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'CUSTOMER_NETWORK_INITIAL_PORTFOLIO_BOOTSTRAPPED',
        targetType: 'CustomerNetworkAuthorityConfiguration',
        targetId: authority.id,
        organizationId,
        reason,
        afterData: this.json({
          authorityId: authority.id,
          portfolioId: portfolio.id,
          assignmentId: assignment.id,
          responsibleUserId: actor.userId,
          permissions,
        }),
      });
      return { authority, portfolio, assignment };
    });
  }

  async createAssignment(
    actor: InternalActor,
    organizationId: string,
    input: CreatePortfolioAssignmentDto,
  ) {
    await this.activeAuthority(organizationId);
    const reason = this.reason(input.reason);
    await this.requireInternalPermission(
      actor,
      organizationId,
      'NETWORK_ASSIGNMENT_MANAGE',
    );
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`customer-network-assignment:${organizationId}`}, 0))`;
      await this.validateAssignmentTarget(tx, organizationId, input);
      const effectiveFrom = input.effectiveFrom
        ? new Date(input.effectiveFrom)
        : new Date();
      const effectiveUntil = input.effectiveUntil
        ? new Date(input.effectiveUntil)
        : null;
      if (effectiveUntil && effectiveUntil <= effectiveFrom)
        throw new BadRequestException('Periode effective invalide.');
      const created = await tx.customerPortfolioAssignment.create({
        data: {
          organizationId,
          subjectType: input.subjectType,
          userId: input.subjectType === 'INTERNAL_USER' ? input.userId : null,
          clientUserId:
            input.subjectType === 'CLIENT_USER' ? input.clientUserId : null,
          operatorUserId:
            input.subjectType === 'OPERATOR_USER' ? input.operatorUserId : null,
          scope: input.scope,
          portfolioId: input.scope === 'PORTFOLIO' ? input.portfolioId : null,
          regionId: input.scope === 'REGION' ? input.regionId : null,
          buildingId: input.scope === 'BUILDING' ? input.buildingId : null,
          permissions: [...new Set(input.permissions)],
          effectiveFrom,
          effectiveUntil,
          grantedByActorType: 'INTERNAL_USER',
          grantedByUserId: actor.userId,
          grantReason: reason,
        },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'CUSTOMER_NETWORK_ASSIGNMENT_CREATED',
        targetType: 'CustomerPortfolioAssignment',
        targetId: created.id,
        organizationId,
        reason,
        afterData: this.json({
          subjectType: created.subjectType,
          userId: created.userId,
          clientUserId: created.clientUserId,
          operatorUserId: created.operatorUserId,
          scope: created.scope,
          permissions: created.permissions,
        }),
      });
      return created;
    });
  }

  async revokeAssignment(
    actor: InternalActor,
    organizationId: string,
    id: string,
    lockVersion: number,
    rawReason: string,
  ) {
    await this.requireInternalPermission(
      actor,
      organizationId,
      'NETWORK_ASSIGNMENT_MANAGE',
    );
    const reason = this.reason(rawReason);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`customer-network-assignment:${organizationId}`}, 0))`;
      const before = await tx.customerPortfolioAssignment.findFirst({
        where: { id, organizationId, status: 'ACTIVE' },
      });
      if (!before)
        throw new NotFoundException('Affectation Network introuvable.');
      if (before.permissions.includes('NETWORK_ASSIGNMENT_MANAGE')) {
        const now = new Date();
        const activeAssignmentManagers =
          await tx.customerPortfolioAssignment.count({
            where: {
              organizationId,
              status: 'ACTIVE',
              permissions: { has: 'NETWORK_ASSIGNMENT_MANAGE' },
              effectiveFrom: { lte: now },
              OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
            },
          });
        if (activeAssignmentManagers <= 1)
          throw new ConflictException(
            'Une affectation de remplacement est requise avant de revoquer le dernier gestionnaire Network.',
          );
      }
      const changed = await tx.customerPortfolioAssignment.updateMany({
        where: { id, organizationId, status: 'ACTIVE', lockVersion },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revokedByActorType: 'INTERNAL_USER',
          revokedByUserId: actor.userId,
          revocationReason: reason,
          lockVersion: { increment: 1 },
        },
      });
      if (changed.count !== 1)
        throw new ConflictException("Conflit de revocation d'affectation.");
      const result = await tx.customerPortfolioAssignment.findUniqueOrThrow({
        where: { id },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'CUSTOMER_NETWORK_ASSIGNMENT_REVOKED',
        targetType: 'CustomerPortfolioAssignment',
        targetId: id,
        organizationId,
        reason,
        beforeData: this.json({ status: before.status, lockVersion }),
        afterData: this.json({
          status: result.status,
          lockVersion: result.lockVersion,
        }),
      });
      return result;
    });
  }

  async createPortfolio(
    actor: InternalActor,
    organizationId: string,
    input: CreatePortfolioDto,
  ) {
    await this.requireInternalPermission(
      actor,
      organizationId,
      'NETWORK_HIERARCHY_MANAGE',
    );
    const reason = this.reason(input.reason);
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.customerPortfolio.create({
        data: {
          organizationId,
          code: input.code,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          createdByUserId: actor.userId,
        },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'CUSTOMER_PORTFOLIO_CREATED',
        targetType: 'CustomerPortfolio',
        targetId: created.id,
        organizationId,
        reason,
        afterData: this.json({ code: created.code, name: created.name }),
      });
      return created;
    });
  }

  async createRegion(
    actor: InternalActor,
    organizationId: string,
    input: CreateRegionDto,
  ) {
    await this.requireInternalPermission(
      actor,
      organizationId,
      'NETWORK_HIERARCHY_MANAGE',
    );
    const reason = this.reason(input.reason);
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.customerPortfolioRegion.create({
        data: {
          organizationId,
          code: input.code,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          createdByUserId: actor.userId,
        },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'CUSTOMER_PORTFOLIO_REGION_CREATED',
        targetType: 'CustomerPortfolioRegion',
        targetId: created.id,
        organizationId,
        reason,
        afterData: this.json({ code: created.code, name: created.name }),
      });
      return created;
    });
  }

  async linkRegion(
    actor: InternalActor,
    organizationId: string,
    portfolioId: string,
    input: LinkRegionDto,
  ) {
    await this.requireInternalPermission(
      actor,
      organizationId,
      'NETWORK_HIERARCHY_MANAGE',
    );
    const reason = this.reason(input.reason);
    return this.prisma.$transaction(async (tx) => {
      const [portfolio, region] = await Promise.all([
        tx.customerPortfolio.findFirst({
          where: { id: portfolioId, organizationId, isActive: true },
        }),
        tx.customerPortfolioRegion.findFirst({
          where: { id: input.regionId, organizationId, isActive: true },
        }),
      ]);
      if (!portfolio || !region)
        throw new BadRequestException('Portfolio ou region invalide.');
      const created = await tx.customerPortfolioRegionLink.create({
        data: {
          organizationId,
          portfolioId,
          regionId: input.regionId,
          createdByUserId: actor.userId,
        },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'CUSTOMER_PORTFOLIO_REGION_LINKED',
        targetType: 'CustomerPortfolioRegionLink',
        targetId: created.id,
        organizationId,
        reason,
        afterData: this.json({ portfolioId, regionId: input.regionId }),
      });
      return created;
    });
  }

  async addBuilding(
    actor: InternalActor,
    organizationId: string,
    portfolioId: string,
    input: AddBuildingMembershipDto,
  ) {
    await this.requireInternalPermission(
      actor,
      organizationId,
      'NETWORK_HIERARCHY_MANAGE',
    );
    const reason = this.reason(input.reason);
    return this.prisma.$transaction(async (tx) => {
      const [link, building] = await Promise.all([
        tx.customerPortfolioRegionLink.findFirst({
          where: { organizationId, portfolioId, regionId: input.regionId },
        }),
        tx.building.findFirst({
          where: { id: input.buildingId, organizationId, isActive: true },
        }),
      ]);
      if (!link || !building)
        throw new BadRequestException('Membership Network invalide.');
      const created = await tx.customerPortfolioBuildingMembership.create({
        data: {
          organizationId,
          portfolioId,
          regionId: input.regionId,
          buildingId: input.buildingId,
          createdByUserId: actor.userId,
        },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'CUSTOMER_PORTFOLIO_BUILDING_ADDED',
        targetType: 'CustomerPortfolioBuildingMembership',
        targetId: created.id,
        organizationId,
        reason,
        afterData: this.json({
          portfolioId,
          regionId: input.regionId,
          buildingId: input.buildingId,
        }),
      });
      return created;
    });
  }

  private async requireClientAssignmentManager(
    tx: Prisma.TransactionClient,
    actor: ClientActor,
  ) {
    const now = new Date();
    const [authority, identity, assignments] = await Promise.all([
      tx.customerNetworkAuthorityConfiguration.findUnique({
        where: { organizationId: actor.organizationId },
        select: { status: true },
      }),
      tx.clientUser.findFirst({
        where: {
          id: actor.sub,
          organizationId: actor.organizationId,
          isActive: true,
        },
        select: { id: true },
      }),
      tx.customerPortfolioAssignment.findMany({
        where: {
          organizationId: actor.organizationId,
          subjectType: 'CLIENT_USER',
          clientUserId: actor.sub,
          status: 'ACTIVE',
          permissions: { has: 'NETWORK_ASSIGNMENT_MANAGE' },
          effectiveFrom: { lte: now },
          OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
        },
      }),
    ]);
    if (authority?.status !== 'ACTIVE' || !identity || !assignments.length)
      throw new ForbiddenException('Autorite de delegation Network requise.');
    return assignments;
  }

  private async assignmentContainsTarget(
    tx: Prisma.TransactionClient,
    manager: {
      scope: string;
      portfolioId: string | null;
      regionId: string | null;
      buildingId: string | null;
      permissions: CustomerNetworkPermission[];
    },
    target: {
      scope: string;
      portfolioId?: string | null;
      regionId?: string | null;
      buildingId?: string | null;
      permissions: CustomerNetworkPermission[];
    },
  ) {
    if (target.permissions.some((permission) => !manager.permissions.includes(permission)))
      return false;
    if (manager.scope === 'BUILDING')
      return target.scope === 'BUILDING' && manager.buildingId === target.buildingId;
    if (manager.scope === 'REGION') {
      if (target.scope === 'REGION') return manager.regionId === target.regionId;
      if (target.scope !== 'BUILDING') return false;
      return Boolean(await tx.customerPortfolioBuildingMembership.findFirst({
        where: { regionId: manager.regionId!, buildingId: target.buildingId! },
        select: { id: true },
      }));
    }
    if (target.scope === 'PORTFOLIO') return manager.portfolioId === target.portfolioId;
    if (target.scope === 'REGION')
      return Boolean(await tx.customerPortfolioRegionLink.findFirst({
        where: { portfolioId: manager.portfolioId!, regionId: target.regionId! },
        select: { id: true },
      }));
    return Boolean(await tx.customerPortfolioBuildingMembership.findFirst({
      where: { portfolioId: manager.portfolioId!, buildingId: target.buildingId! },
      select: { id: true },
    }));
  }

  private async requireClientMayManageTarget(
    tx: Prisma.TransactionClient,
    actor: ClientActor,
    target: {
      scope: string;
      portfolioId?: string | null;
      regionId?: string | null;
      buildingId?: string | null;
      permissions: CustomerNetworkPermission[];
    },
  ) {
    const managers = await this.requireClientAssignmentManager(tx, actor);
    for (const manager of managers) {
      if (await this.assignmentContainsTarget(tx, manager, target)) return;
    }
    throw new ForbiddenException("Le perimetre ou les permissions depassent l'autorite du delegant.");
  }

  async listManagedAssignments(actor: ClientActor) {
    return this.prisma.$transaction(async (tx) => {
      const managers = await this.requireClientAssignmentManager(tx, actor);
      const assignments = await tx.customerPortfolioAssignment.findMany({
        where: { organizationId: actor.organizationId, subjectType: 'CLIENT_USER' },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      });
      const visible: typeof assignments = [];
      for (const assignment of assignments) {
        for (const manager of managers) {
          if (await this.assignmentContainsTarget(tx, manager, assignment)) {
            visible.push(assignment);
            break;
          }
        }
      }
      return visible;
    });
  }

  async clientManagementContext(actor: ClientActor) {
    return this.prisma.$transaction(async (tx) => {
      const managers = await this.requireClientAssignmentManager(tx, actor);
      const [users, portfolios, regions, buildings, assignments, auditEvents] = await Promise.all([
        tx.clientUser.findMany({
          where: { organizationId: actor.organizationId, isActive: true },
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        }),
        tx.customerPortfolio.findMany({ where: { organizationId: actor.organizationId, isActive: true }, select: { id: true, name: true } }),
        tx.customerPortfolioRegion.findMany({ where: { organizationId: actor.organizationId, isActive: true }, select: { id: true, name: true } }),
        tx.building.findMany({ where: { organizationId: actor.organizationId, isActive: true }, select: { id: true, name: true } }),
        tx.customerPortfolioAssignment.findMany({ where: { organizationId: actor.organizationId, subjectType: 'CLIENT_USER' }, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }] }),
        tx.adminAuditEvent.findMany({
          where: { organizationId: actor.organizationId, targetType: 'CustomerPortfolioAssignment' },
          orderBy: { createdAt: 'desc' }, take: 50,
          select: { id: true, actorType: true, actorDisplayName: true, action: true, targetId: true, reason: true, createdAt: true },
        }),
      ]);
      const filterTargets = async <T extends { id: string }>(items: T[], scope: string, key: 'portfolioId' | 'regionId' | 'buildingId') => {
        const visible: T[] = [];
        for (const item of items) {
          for (const manager of managers) {
            if (await this.assignmentContainsTarget(tx, manager, { scope, [key]: item.id, permissions: [] })) {
              visible.push(item); break;
            }
          }
        }
        return visible;
      };
      const visibleAssignments: typeof assignments = [];
      for (const assignment of assignments) {
        for (const manager of managers) {
          if (await this.assignmentContainsTarget(tx, manager, assignment)) {
            visibleAssignments.push(assignment); break;
          }
        }
      }
      const visibleAssignmentIds = new Set(visibleAssignments.map((assignment) => assignment.id));
      return {
        users,
        portfolios: await filterTargets(portfolios, 'PORTFOLIO', 'portfolioId'),
        regions: await filterTargets(regions, 'REGION', 'regionId'),
        buildings: await filterTargets(buildings, 'BUILDING', 'buildingId'),
        assignments: visibleAssignments,
        auditEvents: auditEvents.filter((event) => visibleAssignmentIds.has(event.targetId)),
      };
    });
  }

  async createClientAssignment(actor: ClientActor, input: CreatePortfolioAssignmentDto) {
    if (input.subjectType !== 'CLIENT_USER')
      throw new ForbiddenException('Un administrateur client ne peut deleguer qu’a un utilisateur client.');
    const reason = this.reason(input.reason);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`customer-network-assignment:${actor.organizationId}`}, 0))`;
      await this.requireClientMayManageTarget(tx, actor, input);
      await this.validateAssignmentTarget(tx, actor.organizationId, input);
      const effectiveFrom = input.effectiveFrom ? new Date(input.effectiveFrom) : new Date();
      const effectiveUntil = input.effectiveUntil ? new Date(input.effectiveUntil) : null;
      if (effectiveUntil && effectiveUntil <= effectiveFrom)
        throw new BadRequestException('Periode effective invalide.');
      const created = await tx.customerPortfolioAssignment.create({
        data: {
          organizationId: actor.organizationId,
          subjectType: 'CLIENT_USER',
          clientUserId: input.clientUserId!,
          scope: input.scope,
          portfolioId: input.scope === 'PORTFOLIO' ? input.portfolioId : null,
          regionId: input.scope === 'REGION' ? input.regionId : null,
          buildingId: input.scope === 'BUILDING' ? input.buildingId : null,
          permissions: [...new Set(input.permissions)],
          effectiveFrom,
          effectiveUntil,
          grantedByActorType: 'CLIENT_USER',
          grantedByClientUserId: actor.sub,
          grantReason: reason,
        },
      });
      await this.audit.record(tx, {
        actorType: 'CLIENT_USER',
        actorClientUserId: actor.sub,
        action: 'CUSTOMER_NETWORK_ASSIGNMENT_CREATED',
        targetType: 'CustomerPortfolioAssignment',
        targetId: created.id,
        organizationId: actor.organizationId,
        reason,
        afterData: this.json({ scope: created.scope, permissions: created.permissions, clientUserId: created.clientUserId }),
      });
      return created;
    });
  }

  async revokeClientAssignment(actor: ClientActor, id: string, lockVersion: number, rawReason: string) {
    const reason = this.reason(rawReason);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`customer-network-assignment:${actor.organizationId}`}, 0))`;
      const before = await tx.customerPortfolioAssignment.findFirst({
        where: { id, organizationId: actor.organizationId, status: 'ACTIVE' },
      });
      if (!before) throw new NotFoundException('Affectation Network introuvable.');
      if (before.subjectType !== 'CLIENT_USER')
        throw new ForbiddenException('Une identite client ne peut pas revoquer une affectation interne ou operateur.');
      await this.requireClientMayManageTarget(tx, actor, before);
      if (before.permissions.includes('NETWORK_ASSIGNMENT_MANAGE'))
        await this.requireReplacementManager(tx, actor.organizationId, before, id);
      const changed = await tx.customerPortfolioAssignment.updateMany({
        where: { id, organizationId: actor.organizationId, status: 'ACTIVE', lockVersion },
        data: {
          status: 'REVOKED', revokedAt: new Date(), revokedByActorType: 'CLIENT_USER',
          revokedByClientUserId: actor.sub, revocationReason: reason, lockVersion: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw new ConflictException("Conflit de revocation d'affectation.");
      const result = await tx.customerPortfolioAssignment.findUniqueOrThrow({ where: { id } });
      await this.audit.record(tx, {
        actorType: 'CLIENT_USER', actorClientUserId: actor.sub,
        action: 'CUSTOMER_NETWORK_ASSIGNMENT_REVOKED', targetType: 'CustomerPortfolioAssignment',
        targetId: id, organizationId: actor.organizationId, reason,
        beforeData: this.json({ status: before.status, lockVersion }),
        afterData: this.json({ status: result.status, lockVersion: result.lockVersion }),
      });
      return result;
    });
  }

  private async requireReplacementManager(
    tx: Prisma.TransactionClient,
    organizationId: string,
    target: { scope: string; portfolioId: string | null; regionId: string | null; buildingId: string | null; permissions: CustomerNetworkPermission[] },
    excludedId: string,
  ) {
    const now = new Date();
    const candidates = await tx.customerPortfolioAssignment.findMany({
      where: {
        organizationId, id: { not: excludedId }, status: 'ACTIVE',
        permissions: { has: 'NETWORK_ASSIGNMENT_MANAGE' }, effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
      },
    });
    for (const candidate of candidates)
      if (await this.assignmentContainsTarget(tx, candidate, target)) return;
    throw new ConflictException('Une affectation de remplacement est requise avant de retirer le dernier gestionnaire Network de ce perimetre.');
  }

  async succeedClientAssignment(actor: ClientActor, id: string, input: SucceedPortfolioAssignmentDto) {
    const reason = this.reason(input.reason);
    const effectiveFrom = new Date(input.effectiveFrom);
    if (Number.isNaN(effectiveFrom.getTime())) throw new BadRequestException('Date effective invalide.');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`customer-network-assignment:${actor.organizationId}`}, 0))`;
      const predecessor = await tx.customerPortfolioAssignment.findFirst({
        where: { id, organizationId: actor.organizationId, status: 'ACTIVE' },
      });
      if (!predecessor) throw new NotFoundException('Affectation Network introuvable.');
      if (predecessor.subjectType !== 'CLIENT_USER')
        throw new ForbiddenException('Une identite client ne peut pas transferer une affectation interne ou operateur.');
      await this.requireClientMayManageTarget(tx, actor, predecessor);
      const successor = await tx.clientUser.findFirst({
        where: { id: input.successorClientUserId, organizationId: actor.organizationId, isActive: true },
        select: { id: true },
      });
      if (!successor) throw new BadRequestException('Successeur client invalide.');
      if (predecessor.clientUserId === successor.id)
        throw new BadRequestException('Le successeur doit etre distinct du predecesseur.');
      if (predecessor.effectiveUntil && effectiveFrom >= predecessor.effectiveUntil)
        throw new BadRequestException("La succession doit prendre effet avant l'expiration existante.");
      const changed = await tx.customerPortfolioAssignment.updateMany({
        where: { id, organizationId: actor.organizationId, status: 'ACTIVE', lockVersion: input.lockVersion },
        data: { effectiveUntil: effectiveFrom, lockVersion: { increment: 1 } },
      });
      if (changed.count !== 1) throw new ConflictException('Conflit de succession Network.');
      const created = await tx.customerPortfolioAssignment.create({
        data: {
          organizationId: actor.organizationId, subjectType: 'CLIENT_USER', clientUserId: successor.id,
          scope: predecessor.scope, portfolioId: predecessor.portfolioId, regionId: predecessor.regionId,
          buildingId: predecessor.buildingId, permissions: predecessor.permissions, effectiveFrom,
          effectiveUntil: predecessor.effectiveUntil, grantedByActorType: 'CLIENT_USER',
          grantedByClientUserId: actor.sub, grantReason: reason,
        },
      });
      await this.audit.record(tx, {
        actorType: 'CLIENT_USER', actorClientUserId: actor.sub,
        action: 'CUSTOMER_NETWORK_ASSIGNMENT_SUCCEEDED', targetType: 'CustomerPortfolioAssignment',
        targetId: created.id, organizationId: actor.organizationId, reason,
        beforeData: this.json({ predecessorId: predecessor.id, clientUserId: predecessor.clientUserId }),
        afterData: this.json({ successorId: created.id, clientUserId: successor.id, effectiveFrom }),
      });
      return { predecessorId: predecessor.id, successor: created };
    });
  }

  private async clientBuildingScope(actor: ClientActor) {
    await this.activeAuthority(actor.organizationId);
    const now = new Date();
    const clientUser = await this.prisma.clientUser.findFirst({
      where: {
        id: actor.sub,
        organizationId: actor.organizationId,
        isActive: true,
      },
      select: { id: true },
    });
    if (!clientUser) throw new ForbiddenException('Identite client invalide.');
    const assignments = await this.prisma.customerPortfolioAssignment.findMany({
      where: {
        organizationId: actor.organizationId,
        subjectType: 'CLIENT_USER',
        clientUserId: actor.sub,
        status: 'ACTIVE',
        permissions: { has: 'NETWORK_SUPERVISION_READ' },
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
      },
      select: {
        scope: true,
        portfolioId: true,
        regionId: true,
        buildingId: true,
      },
    });
    if (!assignments.length)
      throw new ForbiddenException('Affectation Network requise.');
    const portfolioIds = assignments
      .filter((a) => a.scope === 'PORTFOLIO')
      .map((a) => a.portfolioId!);
    const regionIds = assignments
      .filter((a) => a.scope === 'REGION')
      .map((a) => a.regionId!);
    const direct = assignments
      .filter((a) => a.scope === 'BUILDING')
      .map((a) => a.buildingId!);
    const memberships =
      portfolioIds.length || regionIds.length
        ? await this.prisma.customerPortfolioBuildingMembership.findMany({
            where: {
              organizationId: actor.organizationId,
              OR: [
                ...(portfolioIds.length
                  ? [{ portfolioId: { in: portfolioIds } }]
                  : []),
                ...(regionIds.length ? [{ regionId: { in: regionIds } }] : []),
              ],
            },
            select: { buildingId: true },
          })
        : [];
    return [...new Set([...direct, ...memberships.map((m) => m.buildingId)])];
  }

  async hasClientAccess(actor: ClientActor) {
    try {
      const buildingIds = await this.clientBuildingScope(actor);
      return { enabled: buildingIds.length > 0 };
    } catch (error) {
      if (error instanceof ForbiddenException) return { enabled: false };
      throw error;
    }
  }

  private freshness(date: Date | null | undefined, applicable = true) {
    if (!applicable) return 'NOT_APPLICABLE' as const;
    if (!date) return 'UNKNOWN' as const;
    return Date.now() - date.getTime() <= 24 * 60 * 60 * 1000
      ? ('CURRENT' as const)
      : ('STALE' as const);
  }

  private analyticsRange(query: PortfolioAnalyticsQueryDto) {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 11, 1));
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to)
      throw new BadRequestException('Periode analytique invalide.');
    if (to.getTime() - from.getTime() > 5 * 366 * 24 * 60 * 60 * 1000)
      throw new BadRequestException('La periode analytique est limitee a cinq ans.');
    return { from, to };
  }

  private monthKey(date: Date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private async analyticsScope(actor: ClientActor, query: PortfolioAnalyticsQueryDto) {
    const scopedIds = await this.clientBuildingScope(actor);
    const memberships = await this.prisma.customerPortfolioBuildingMembership.findMany({
      where: { organizationId: actor.organizationId, buildingId: { in: scopedIds } },
      select: { buildingId: true, portfolioId: true, regionId: true },
    });
    const filtered = memberships.filter((row) =>
      (!query.portfolioId || row.portfolioId === query.portfolioId) &&
      (!query.regionId || row.regionId === query.regionId));
    let buildingIds = query.portfolioId || query.regionId
      ? [...new Set(filtered.map((row) => row.buildingId))]
      : scopedIds;
    if (query.buildingId) {
      if (!buildingIds.includes(query.buildingId))
        throw new ForbiddenException('Perimetre analytique non autorise.');
      buildingIds = [query.buildingId];
    }
    if ((query.portfolioId || query.regionId) && !buildingIds.length)
      throw new ForbiddenException('Perimetre analytique non autorise.');
    const [portfolios, regions] = await Promise.all([
      this.prisma.customerPortfolio.findMany({
        where: { organizationId: actor.organizationId, id: { in: [...new Set(memberships.map((row) => row.portfolioId))] }, isActive: true },
        orderBy: [{ name: 'asc' }, { id: 'asc' }], select: { id: true, name: true },
      }),
      this.prisma.customerPortfolioRegion.findMany({
        where: { organizationId: actor.organizationId, id: { in: [...new Set(memberships.map((row) => row.regionId))] }, isActive: true },
        orderBy: [{ name: 'asc' }, { id: 'asc' }], select: { id: true, name: true },
      }),
    ]);
    return { buildingIds, portfolios, regions };
  }

  async analytics(actor: ClientActor, query: PortfolioAnalyticsQueryDto) {
    const { from, to } = this.analyticsRange(query);
    const scope = await this.analyticsScope(actor, query);
    const [buildings, incidents, reports, reviews, actions] = await Promise.all([
      this.prisma.building.findMany({
        where: { organizationId: actor.organizationId, id: { in: scope.buildingIds } },
        orderBy: [{ name: 'asc' }, { id: 'asc' }], select: { id: true, name: true },
      }),
      this.prisma.incidentEvent.findMany({
        where: { organizationId: actor.organizationId, buildingId: { in: scope.buildingIds }, triggeredAt: { gte: from, lte: to } },
        select: { id: true, status: true, isExercise: true, triggeredAt: true, updatedAt: true },
      }),
      this.prisma.exerciseReport.findMany({
        where: { organizationId: actor.organizationId, buildingId: { in: scope.buildingIds }, status: 'PUBLISHED', createdAt: { lte: to } },
        select: { id: true, occurredAt: true, publishedAt: true, createdAt: true, updatedAt: true },
      }),
      this.prisma.operationalReview.findMany({
        where: { organizationId: actor.organizationId, buildingId: { in: scope.buildingIds }, createdAt: { lte: to } },
        select: { id: true, finalizedAt: true, createdAt: true, updatedAt: true },
      }),
      this.prisma.correctiveAction.findMany({
        where: { organizationId: actor.organizationId, buildingId: { in: scope.buildingIds }, createdAt: { lte: to }, status: { not: 'CANCELLED' } },
        select: { id: true, status: true, dueDate: true, createdAt: true, updatedAt: true, completedAt: true, verifiedAt: true, closedAt: true },
      }),
    ]);
    const inRange = (date: Date | null | undefined) => Boolean(date && date >= from && date <= to);
    const reportDate = (row: (typeof reports)[number]) => row.occurredAt ?? row.publishedAt ?? row.createdAt;
    const reviewDate = (row: (typeof reviews)[number]) => row.finalizedAt ?? row.createdAt;
    const selectedIncidents = incidents.filter((row) => !row.isExercise);
    const selectedReports = reports.filter((row) => inRange(reportDate(row)));
    const selectedReviews = reviews.filter((row) => inRange(reviewDate(row)));
    const selectedActions = actions.filter((row) => inRange(row.createdAt));
    const openActions = actions.filter((row) => ['PLANNED', 'IN_PROGRESS'].includes(row.status));
    const trends: Array<{ period: string; incidents: number; exercises: number; operationalReviews: number; correctiveActionsCreated: number; correctiveActionsDue: number }> = [];
    const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
    const last = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
    while (cursor <= last) {
      trends.push({ period: this.monthKey(cursor), incidents: 0, exercises: 0, operationalReviews: 0, correctiveActionsCreated: 0, correctiveActionsDue: 0 });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    const byPeriod = new Map(trends.map((row) => [row.period, row]));
    const increment = (date: Date | null | undefined, field: Exclude<keyof (typeof trends)[number], 'period'>) => {
      if (!date || !inRange(date)) return;
      const row = byPeriod.get(this.monthKey(date));
      if (row) row[field] += 1;
    };
    selectedIncidents.forEach((row) => increment(row.triggeredAt, 'incidents'));
    selectedReports.forEach((row) => increment(reportDate(row), 'exercises'));
    selectedReviews.forEach((row) => increment(reviewDate(row), 'operationalReviews'));
    selectedActions.forEach((row) => increment(row.createdAt, 'correctiveActionsCreated'));
    actions.forEach((row) => increment(row.dueDate, 'correctiveActionsDue'));
    const latest = (dates: Array<Date | null | undefined>) => dates.reduce<Date | null>((value, date) => date && (!value || date > value) ? date : value, null);
    const observed = {
      incidents: latest(selectedIncidents.map((row) => row.updatedAt)),
      exercises: latest(selectedReports.map((row) => row.updatedAt)),
      operationalReviews: latest(selectedReviews.map((row) => row.updatedAt)),
      correctiveActions: latest(actions.map((row) => row.updatedAt)),
    };
    const generatedAt = new Date();
    return {
      generatedAt, period: { from, to },
      filters: { portfolioId: query.portfolioId ?? null, regionId: query.regionId ?? null, buildingId: query.buildingId ?? null },
      scope: { organizationId: actor.organizationId, buildingCount: buildings.length, buildings: buildings.map(({ id, name }) => ({ id, name })), portfolios: scope.portfolios, regions: scope.regions },
      summary: {
        incidents: { total: selectedIncidents.length, active: selectedIncidents.filter((row) => ['PRE_ALERT', 'ACTIVE', 'CONTAINED'].includes(row.status)).length, resolved: selectedIncidents.filter((row) => row.status === 'RESOLVED').length },
        exercises: { published: selectedReports.length },
        operationalReviews: { total: selectedReviews.length },
        correctiveActions: {
          created: selectedActions.length, open: openActions.length,
          overdue: openActions.filter((row) => row.dueDate && row.dueDate < generatedAt).length,
          completed: actions.filter((row) => row.completedAt).length,
          verified: actions.filter((row) => row.verifiedAt).length,
          closed: actions.filter((row) => row.closedAt).length,
        },
      },
      trends,
      freshness: Object.fromEntries(Object.entries(observed).map(([source, date]) => [source, { state: this.freshness(date), observedAt: date }])),
      missingData: Object.entries(observed).filter(([, date]) => !date).map(([source]) => source),
      provenance: {
        incidents: 'IncidentEvent.triggeredAt', exercises: 'ExerciseReport.occurredAt|publishedAt|createdAt (PUBLISHED)',
        operationalReviews: 'OperationalReview.finalizedAt|createdAt', correctiveActions: 'CorrectiveAction.createdAt|dueDate|lifecycle timestamps',
        authorization: 'CustomerPortfolioAssignment.NETWORK_SUPERVISION_READ',
      },
    };
  }

  private csvCell(value: unknown) {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  async exportAnalytics(actor: ClientActor, query: PortfolioAnalyticsQueryDto) {
    const analytics = await this.analytics(actor, query);
    const rows: unknown[][] = [
      ['# generated_at', analytics.generatedAt.toISOString()], ['# organization_id', actor.organizationId],
      ['# period_from', analytics.period.from.toISOString()], ['# period_to', analytics.period.to.toISOString()],
      ['# building_count', analytics.scope.buildingCount], ['# missing_data', analytics.missingData.join('|')],
      ['period', 'incidents', 'exercises', 'operational_reviews', 'corrective_actions_created', 'corrective_actions_due'],
      ...analytics.trends.map((row) => [row.period, row.incidents, row.exercises, row.operationalReviews, row.correctiveActionsCreated, row.correctiveActionsDue]),
    ];
    const bytes = Buffer.from('\uFEFF' + rows.map((row) => row.map((cell) => this.csvCell(cell)).join(',')).join('\r\n') + '\r\n', 'utf8');
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    await this.prisma.$transaction(async (tx) => this.audit.record(tx, {
      actorType: 'CLIENT_USER', actorClientUserId: actor.sub, action: 'CUSTOMER_NETWORK_ANALYTICS_EXPORTED',
      targetType: 'CustomerPortfolioAnalytics', targetId: actor.organizationId, organizationId: actor.organizationId,
      reason: 'Export analytique Network demande par un utilisateur autorise.',
      afterData: this.json({ filters: analytics.filters, period: { from: analytics.period.from.toISOString(), to: analytics.period.to.toISOString() }, buildingCount: analytics.scope.buildingCount, sha256 }),
    }));
    return { filename: `coro-network-analytics-${analytics.generatedAt.toISOString().slice(0, 10)}.csv`, bytes, sha256 };
  }

  async supervision(
    actor: ClientActor,
    query: PortfolioQueryDto,
    exactBuildingId?: string,
  ) {
    const scopedIds = await this.clientBuildingScope(actor);
    const membershipFilter: Prisma.CustomerPortfolioBuildingMembershipWhereInput =
      {
        organizationId: actor.organizationId,
        buildingId: { in: scopedIds },
        ...(query.portfolioId ? { portfolioId: query.portfolioId } : {}),
        ...(query.regionId ? { regionId: query.regionId } : {}),
      };
    const filteredMemberships =
      query.portfolioId || query.regionId
        ? await this.prisma.customerPortfolioBuildingMembership.findMany({
            where: membershipFilter,
            select: { buildingId: true },
          })
        : null;
    const allowedIds = filteredMemberships
      ? [...new Set(filteredMemberships.map((m) => m.buildingId))]
      : scopedIds;
    const where: Prisma.BuildingWhereInput = {
      organizationId: actor.organizationId,
      id: exactBuildingId
        ? { equals: exactBuildingId, in: allowedIds }
        : { in: allowedIds },
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { city: { contains: query.search, mode: 'insensitive' } },
              { address: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [total, buildings] = await Promise.all([
      this.prisma.building.count({ where }),
      this.prisma.building.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip,
        take: query.pageSize,
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          province: true,
          updatedAt: true,
        },
      }),
    ]);
    const ids = buildings.map((b) => b.id);
    const [
      incidents,
      occupancy,
      occupancyHistory,
      requirements,
      evidence,
      actions,
    ] = await Promise.all([
      this.prisma.incidentEvent.findMany({
        where: {
          organizationId: actor.organizationId,
          buildingId: { in: ids },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        select: {
          id: true,
          buildingId: true,
          type: true,
          status: true,
          isActive: true,
          triggeredAt: true,
          updatedAt: true,
          resolvedAt: true,
          occupantsSnapshot: true,
        },
      }),
      this.prisma.occupancyRecord.groupBy({
        by: ['buildingId'],
        where: {
          organizationId: actor.organizationId,
          buildingId: { in: ids },
          status: 'IN',
        },
        _count: { _all: true },
        _max: { checkedInAt: true },
      }),
      this.prisma.occupancyRecord.groupBy({
        by: ['buildingId'],
        where: {
          organizationId: actor.organizationId,
          buildingId: { in: ids },
        },
        _count: { _all: true },
        _max: { checkedInAt: true, checkedOutAt: true },
      }),
      this.prisma.buildingRequirement.groupBy({
        by: ['buildingId'],
        where: { buildingId: { in: ids }, isRequired: true },
        _count: { _all: true },
        _max: { updatedAt: true },
      }),
      this.prisma.complianceEvidence.groupBy({
        by: ['buildingId'],
        where: {
          organizationId: actor.organizationId,
          buildingId: { in: ids },
        },
        _count: { _all: true },
        _max: { updatedAt: true },
      }),
      this.prisma.correctiveAction.findMany({
        where: {
          organizationId: actor.organizationId,
          buildingId: { in: ids },
          status: { not: 'CANCELLED' },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          reference: true,
          buildingId: true,
          title: true,
          status: true,
          priority: true,
          assignedTo: true,
          assigneeDisplayNameSnapshot: true,
          dueDate: true,
          updatedAt: true,
          incidentId: true,
          exerciseReportId: true,
          reviewRecommendationId: true,
          closedAt: true,
          _count: {
            select: {
              evidence: { where: { status: 'ACTIVE' } },
              verifications: true,
            },
          },
        },
      }),
    ]);
    const by = <T extends { buildingId: string | null }>(rows: T[]) =>
      new Map(rows.filter((r) => r.buildingId).map((r) => [r.buildingId!, r]));
    const occupancyBy = by(occupancy);
    const occupancyHistoryBy = by(occupancyHistory);
    const requirementBy = by(requirements);
    const evidenceBy = by(evidence);
    const generatedAt = new Date();
    const canManage = Boolean(await this.prisma.customerPortfolioAssignment.findFirst({
      where: {
        organizationId: actor.organizationId,
        subjectType: 'CLIENT_USER', clientUserId: actor.sub, status: 'ACTIVE',
        permissions: { has: 'NETWORK_ASSIGNMENT_MANAGE' }, effectiveFrom: { lte: generatedAt },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: generatedAt } }],
      },
      select: { id: true },
    }));
    return {
      generatedAt,
      canManage,
      provenance: {
        buildings: 'Building',
        incidents: 'IncidentEvent',
        occupancy: 'OccupancyRecord',
        documents: 'BuildingRequirement+ComplianceEvidence',
        actions: 'CorrectiveAction',
      },
      page: query.page,
      pageSize: query.pageSize,
      total,
      items: buildings.map((building) => {
        const buildingIncidents = incidents.filter(
          (incident) => incident.buildingId === building.id,
        );
        const activeIncidents = buildingIncidents.filter(
          (incident) =>
            incident.isActive &&
            ['PRE_ALERT', 'ACTIVE', 'CONTAINED'].includes(incident.status),
        );
        const latestIncident = buildingIncidents[0];
        const present = occupancyBy.get(building.id);
        const occupancyObserved = occupancyHistoryBy.get(building.id);
        const required = requirementBy.get(building.id);
        const documented = evidenceBy.get(building.id);
        const buildingActions = actions.filter(
          (action) => action.buildingId === building.id,
        );
        const openActions = buildingActions.filter((action) =>
          ['PLANNED', 'IN_PROGRESS'].includes(action.status),
        );
        const latestAction = buildingActions.reduce(
          (latest, action) =>
            !latest || action.updatedAt > latest.updatedAt ? action : latest,
          buildingActions[0],
        );
        return {
          ...building,
          incidentSummary: {
            // Keep the original aggregate field as an active-incident alias for
            // consumers compiled against the P-1.1 response contract.
            count: activeIncidents.length,
            active: activeIncidents.length,
            resolved: buildingIncidents.filter(
              (incident) => incident.status === 'RESOLVED',
            ).length,
            observedAt: latestIncident?.updatedAt ?? null,
            freshness: this.freshness(latestIncident?.updatedAt),
            items: activeIncidents.map((incident) => ({
              id: incident.id,
              type: incident.type,
              status: incident.status,
              triggeredAt: incident.triggeredAt,
              updatedAt: incident.updatedAt,
              occupancySnapshotCount: Array.isArray(incident.occupantsSnapshot)
                ? incident.occupantsSnapshot.length
                : null,
            })),
          },
          occupancySummary: {
            present: occupancyObserved ? (present?._count._all ?? 0) : null,
            observedAt:
              occupancyObserved?._max.checkedOutAt ??
              occupancyObserved?._max.checkedInAt ??
              null,
            freshness: this.freshness(
              occupancyObserved?._max.checkedOutAt ??
                occupancyObserved?._max.checkedInAt,
            ),
          },
          documentSummary: {
            required: required?._count._all ?? 0,
            evidence: documented?._count._all ?? 0,
            observedAt: documented?._max.updatedAt ?? null,
            freshness: this.freshness(
              documented?._max.updatedAt,
              (required?._count._all ?? 0) > 0,
            ),
          },
          actionSummary: {
            open: openActions.length,
            overdue: openActions.filter(
              (action) => action.dueDate && action.dueDate < generatedAt,
            ).length,
            completed: buildingActions.filter((action) =>
              ['COMPLETED', 'VERIFIED'].includes(action.status),
            ).length,
            closed: buildingActions.filter((action) => action.closedAt !== null)
              .length,
            observedAt: latestAction?.updatedAt ?? null,
            freshness: this.freshness(latestAction?.updatedAt),
            items: exactBuildingId
              ? buildingActions.map((action) => ({
                  id: action.id,
                  reference: action.reference,
                  title: action.title,
                  status: action.status,
                  priority: action.priority,
                  responsible:
                    action.assigneeDisplayNameSnapshot ?? action.assignedTo,
                  dueDate: action.dueDate,
                  overdue: Boolean(
                    action.dueDate &&
                    action.dueDate < generatedAt &&
                    ['PLANNED', 'IN_PROGRESS'].includes(action.status),
                  ),
                  evidenceCount: action._count.evidence,
                  verificationCount: action._count.verifications,
                  source: action.incidentId
                    ? 'INCIDENT'
                    : action.exerciseReportId
                      ? 'EXERCISE'
                      : action.reviewRecommendationId
                        ? 'AUDIT_REVIEW'
                        : 'DIRECT',
                  updatedAt: action.updatedAt,
                  closedAt: action.closedAt,
                }))
              : undefined,
          },
        };
      }),
    };
  }

  async building(actor: ClientActor, buildingId: string) {
    const scopedIds = await this.clientBuildingScope(actor);
    if (!scopedIds.includes(buildingId))
      throw new ForbiddenException('Batiment hors perimetre Network.');
    const result = await this.supervision(
      actor,
      {
        page: 1,
        pageSize: 1,
        search: undefined,
      },
      buildingId,
    );
    const item = result.items.find((entry) => entry.id === buildingId);
    if (item) return item;
    const exists = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId: actor.organizationId },
    });
    if (!exists) throw new NotFoundException('Batiment introuvable.');
    throw new ForbiddenException('Batiment hors perimetre Network.');
  }
}
