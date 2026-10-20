import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  PortfolioQueryDto,
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
            select: { id: true },
          })
        : await tx.clientUser.findFirst({
            where: { id: input.clientUserId, organizationId, isActive: true },
            select: { id: true },
          });
    if (!subject) throw new BadRequestException('Sujet Network invalide.');
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
          scope: input.scope,
          portfolioId: input.scope === 'PORTFOLIO' ? input.portfolioId : null,
          regionId: input.scope === 'REGION' ? input.regionId : null,
          buildingId: input.scope === 'BUILDING' ? input.buildingId : null,
          permissions: [...new Set(input.permissions)],
          effectiveFrom,
          effectiveUntil,
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
    return {
      generatedAt,
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
