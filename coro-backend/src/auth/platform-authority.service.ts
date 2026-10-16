import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PlatformPermission,
  PlatformPermissionScope,
  Prisma,
  UserRole,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { WorkManagementActor } from './work-management-access';

type Actor = Pick<WorkManagementActor, 'userId'>;

@Injectable()
export class PlatformAuthorityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async resolveTargetOrganization(
    kind:
      | 'WORKSPACE'
      | 'SCENARIO'
      | 'PROPOSAL'
      | 'PROPOSAL_REVISION'
      | 'CONTRACT'
      | 'CONTRACT_REVISION'
      | 'COMPOSITION_SNAPSHOT'
      | 'ENTITLEMENT',
    resourceId: string,
  ): Promise<string> {
    let organizationId: string | null | undefined;
    switch (kind) {
      case 'WORKSPACE':
        organizationId = (
          await this.prisma.commercialSimulationWorkspace.findUnique({
            where: { id: resourceId },
            select: { organizationId: true },
          })
        )?.organizationId;
        break;
      case 'SCENARIO':
        organizationId = (
          await this.prisma.commercialSimulationScenario.findUnique({
            where: { id: resourceId },
            select: { workspace: { select: { organizationId: true } } },
          })
        )?.workspace.organizationId;
        break;
      case 'PROPOSAL':
        organizationId = (
          await this.prisma.commercialProposal.findUnique({
            where: { id: resourceId },
            select: { organizationId: true },
          })
        )?.organizationId;
        break;
      case 'PROPOSAL_REVISION':
        organizationId = (
          await this.prisma.commercialProposalRevision.findUnique({
            where: { id: resourceId },
            select: { proposal: { select: { organizationId: true } } },
          })
        )?.proposal.organizationId;
        break;
      case 'CONTRACT':
        organizationId = (
          await this.prisma.organizationContract.findUnique({
            where: { id: resourceId },
            select: { organizationId: true },
          })
        )?.organizationId;
        break;
      case 'CONTRACT_REVISION':
        organizationId = (
          await this.prisma.organizationContractRevision.findUnique({
            where: { id: resourceId },
            select: { contract: { select: { organizationId: true } } },
          })
        )?.contract.organizationId;
        break;
      case 'COMPOSITION_SNAPSHOT':
        organizationId = (
          await this.prisma.proposalDocumentCompositionSnapshot.findUnique({
            where: { id: resourceId },
            select: {
              proposalRevision: {
                select: { proposal: { select: { organizationId: true } } },
              },
            },
          })
        )?.proposalRevision.proposal.organizationId;
        break;
      case 'ENTITLEMENT':
        organizationId = (
          await this.prisma.capabilityEntitlement.findUnique({
            where: { id: resourceId },
            select: { organizationId: true },
          })
        )?.organizationId;
        break;
    }
    if (!organizationId) {
      throw new ForbiddenException(
        'Organisation de la ressource introuvable ou ambiguÃ«.',
      );
    }
    return organizationId;
  }

  async requirePermission(
    actor: Actor,
    permission: PlatformPermission,
    targetOrganizationId?: string,
  ) {
    const [user, authority] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: actor?.userId },
        select: {
          id: true,
          role: true,
          organizationId: true,
          isActive: true,
          organization: { select: { isActive: true, isInternal: true } },
        },
      }),
      this.prisma.platformAuthorityConfiguration.findUnique({
        where: { id: 'PRIMARY' },
        include: {
          operatorOrganization: {
            select: { id: true, isActive: true, isInternal: true },
          },
          founder: {
            select: {
              id: true,
              role: true,
              organizationId: true,
              isActive: true,
            },
          },
        },
      }),
    ]);
    if (!user?.isActive) throw new ForbiddenException('Accès interdit.');

    // Explicit transition compatibility: before activation, only the existing
    // persisted SUPER_ADMIN retains platform access. ACTIVE has no role-only fallback.
    if (!authority || authority.status === 'DRAFT') {
      if (user.role !== UserRole.SUPER_ADMIN)
        throw new ForbiddenException('Accès plateforme interdit.');
      return { kind: 'LEGACY_SUPER_ADMIN' as const, user };
    }

    this.assertActiveAuthority(authority);
    if (user.id === authority.founderUserId) {
      return { kind: 'FOUNDER' as const, user };
    }
    if (
      user.organizationId !== authority.operatorOrganizationId ||
      !user.organization.isActive ||
      !user.organization.isInternal
    ) {
      throw new ForbiddenException('Accès plateforme interdit.');
    }
    const grant = await this.prisma.platformPermissionGrant.findFirst({
      where: {
        userId: user.id,
        permission,
        status: 'ACTIVE',
        effectiveFrom: { lte: new Date() },
        OR: [
          { scope: PlatformPermissionScope.GLOBAL },
          ...(targetOrganizationId
            ? [
                {
                  scope: PlatformPermissionScope.ORGANIZATION,
                  targetOrganizationId,
                } as const,
              ]
            : []),
        ],
      },
      select: { id: true, scope: true, targetOrganizationId: true },
    });
    if (!grant) throw new ForbiddenException('Permission plateforme requise.');
    return { kind: 'DELEGATED' as const, user, grant };
  }

  async effectivePermissions(actor: Actor) {
    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      select: { id: true, role: true, organizationId: true, isActive: true },
    });
    if (!user?.isActive) throw new ForbiddenException('Accès interdit.');
    const authority =
      await this.prisma.platformAuthorityConfiguration.findUnique({
        where: { id: 'PRIMARY' },
      });
    if (!authority || authority.status === 'DRAFT') {
      return {
        authorityStatus: authority?.status ?? 'UNCONFIGURED',
        founder: user.role === UserRole.SUPER_ADMIN,
        grants: [],
      };
    }
    if (user.id === authority.founderUserId)
      return { authorityStatus: 'ACTIVE', founder: true, grants: [] };
    const grants = await this.prisma.platformPermissionGrant.findMany({
      where: {
        userId: user.id,
        status: 'ACTIVE',
        effectiveFrom: { lte: new Date() },
      },
      select: {
        permission: true,
        scope: true,
        targetOrganizationId: true,
      },
    });
    return { authorityStatus: 'ACTIVE', founder: false, grants };
  }

  async requireFounderAuthority(actor: Actor) {
    const [user, authority] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: actor?.userId },
        select: { id: true, role: true, isActive: true },
      }),
      this.prisma.platformAuthorityConfiguration.findUnique({
        where: { id: 'PRIMARY' },
        include: { founder: true, operatorOrganization: true },
      }),
    ]);
    if (!user?.isActive) throw new ForbiddenException('Accès interdit.');
    if (!authority || authority.status === 'DRAFT') {
      if (user.role !== UserRole.SUPER_ADMIN)
        throw new ForbiddenException('Accès plateforme interdit.');
      return;
    }
    this.assertActiveAuthority(authority);
    if (user.id !== authority.founderUserId)
      throw new ForbiddenException('Founder requis.');
  }

  async createDraft(
    actor: Actor,
    input: {
      operatorOrganizationId: string;
      founderUserId: string;
      reason: string;
    },
  ) {
    const reason = this.audit.normalizeReason(input.reason, true)!;
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('platform-authority:PRIMARY', 0))`;
      if (
        await tx.platformAuthorityConfiguration.findUnique({
          where: { id: 'PRIMARY' },
        })
      )
        throw new ConflictException('Autorité plateforme déjà configurée.');
      const [founder, organization, superAdminCount] = await Promise.all([
        tx.user.findUnique({
          where: { id: input.founderUserId },
          select: {
            id: true,
            role: true,
            organizationId: true,
            isActive: true,
          },
        }),
        tx.organization.findUnique({
          where: { id: input.operatorOrganizationId },
          select: { id: true, isActive: true, isInternal: true },
        }),
        tx.user.count({
          where: { role: UserRole.SUPER_ADMIN, isActive: true },
        }),
      ]);
      if (
        !founder?.isActive ||
        founder.role !== UserRole.SUPER_ADMIN ||
        founder.id !== actor.userId ||
        founder.organizationId !== organization?.id ||
        !organization.isActive ||
        !organization.isInternal ||
        superAdminCount !== 1
      )
        throw new ForbiddenException('Identité opérateur ou Founder invalide.');
      const created = await tx.platformAuthorityConfiguration.create({
        data: {
          id: 'PRIMARY',
          operatorOrganizationId: organization.id,
          founderUserId: founder.id,
          createdByUserId: founder.id,
        },
      });
      await this.audit.record(tx, {
        actorUserId: founder.id,
        action: 'PLATFORM_AUTHORITY_DRAFT_CREATED',
        targetType: 'PlatformAuthorityConfiguration',
        targetId: created.id,
        organizationId: organization.id,
        reason,
        afterData: this.json({
          status: created.status,
          operatorOrganizationId: created.operatorOrganizationId,
          founderUserId: created.founderUserId,
        }),
      });
      return created;
    });
  }

  async activate(actor: Actor, lockVersion: number, rawReason: string) {
    const reason = this.audit.normalizeReason(rawReason, true)!;
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('platform-authority:PRIMARY', 0))`;
      const authority = await tx.platformAuthorityConfiguration.findUnique({
        where: { id: 'PRIMARY' },
      });
      if (!authority || authority.status !== 'DRAFT')
        throw new ConflictException('Autorité plateforme non activable.');
      if (authority.founderUserId !== actor.userId)
        throw new ForbiddenException('Founder requis.');
      const [founder, organization, superAdminCount] = await Promise.all([
        tx.user.findUnique({ where: { id: authority.founderUserId } }),
        tx.organization.findUnique({
          where: { id: authority.operatorOrganizationId },
        }),
        tx.user.count({
          where: { role: UserRole.SUPER_ADMIN, isActive: true },
        }),
      ]);
      if (
        !founder?.isActive ||
        founder.role !== UserRole.SUPER_ADMIN ||
        founder.organizationId !== organization?.id ||
        !organization.isActive ||
        !organization.isInternal ||
        superAdminCount !== 1
      )
        throw new ForbiddenException('Préconditions d’activation invalides.');
      const result = await tx.platformAuthorityConfiguration.updateMany({
        where: { id: 'PRIMARY', status: 'DRAFT', lockVersion },
        data: {
          status: 'ACTIVE',
          activatedByUserId: actor.userId,
          activatedAt: new Date(),
          activationReason: reason,
          lockVersion: { increment: 1 },
        },
      });
      if (result.count !== 1)
        throw new ConflictException('Conflit d’activation.');
      const active = await tx.platformAuthorityConfiguration.findUniqueOrThrow({
        where: { id: 'PRIMARY' },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'PLATFORM_AUTHORITY_ACTIVATED',
        targetType: 'PlatformAuthorityConfiguration',
        targetId: active.id,
        organizationId: active.operatorOrganizationId,
        reason,
        afterData: this.json({
          status: active.status,
          lockVersion: active.lockVersion,
        }),
      });
      return active;
    });
  }

  async createGrant(
    actor: Actor,
    input: {
      userId: string;
      permission: PlatformPermission;
      scope: PlatformPermissionScope;
      targetOrganizationId?: string;
      effectiveFrom?: string;
      reason: string;
    },
  ) {
    const reason = this.audit.normalizeReason(input.reason, true)!;
    await this.requireFounder(actor);
    return this.prisma.$transaction(async (tx) => {
      const authority =
        await tx.platformAuthorityConfiguration.findUniqueOrThrow({
          where: { id: 'PRIMARY' },
        });
      const user = await tx.user.findUnique({ where: { id: input.userId } });
      if (
        !user?.isActive ||
        user.organizationId !== authority.operatorOrganizationId ||
        user.role === UserRole.SUPER_ADMIN
      )
        throw new BadRequestException('Employé CORO délégué invalide.');
      if (
        (input.scope === PlatformPermissionScope.GLOBAL &&
          input.targetOrganizationId) ||
        (input.scope === PlatformPermissionScope.ORGANIZATION &&
          !input.targetOrganizationId)
      )
        throw new BadRequestException('Scope de permission invalide.');
      if (input.targetOrganizationId) {
        const target = await tx.organization.findUnique({
          where: { id: input.targetOrganizationId },
        });
        if (!target)
          throw new NotFoundException('Organisation cible introuvable.');
      }
      const grant = await tx.platformPermissionGrant.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          permission: input.permission,
          scope: input.scope,
          targetOrganizationId: input.targetOrganizationId,
          effectiveFrom: input.effectiveFrom
            ? new Date(input.effectiveFrom)
            : new Date(),
          grantedByUserId: actor.userId,
          grantReason: reason,
        },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'PLATFORM_PERMISSION_GRANTED',
        targetType: 'PlatformPermissionGrant',
        targetId: grant.id,
        organizationId: grant.targetOrganizationId,
        reason,
        afterData: this.json({
          userId: grant.userId,
          permission: grant.permission,
          scope: grant.scope,
          targetOrganizationId: grant.targetOrganizationId,
        }),
      });
      return grant;
    });
  }

  async listGrants(actor: Actor) {
    await this.requireFounder(actor);
    return this.prisma.platformPermissionGrant.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async revokeGrant(
    actor: Actor,
    id: string,
    lockVersion: number,
    rawReason: string,
  ) {
    const reason = this.audit.normalizeReason(rawReason, true)!;
    await this.requireFounder(actor);
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.platformPermissionGrant.findUnique({
        where: { id },
      });
      if (!before || before.status !== 'ACTIVE')
        throw new NotFoundException('Permission active introuvable.');
      const result = await tx.platformPermissionGrant.updateMany({
        where: { id, status: 'ACTIVE', lockVersion },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revokedByUserId: actor.userId,
          revocationReason: reason,
          lockVersion: { increment: 1 },
        },
      });
      if (result.count !== 1)
        throw new ConflictException('Conflit de révocation.');
      const revoked = await tx.platformPermissionGrant.findUniqueOrThrow({
        where: { id },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'PLATFORM_PERMISSION_REVOKED',
        targetType: 'PlatformPermissionGrant',
        targetId: id,
        organizationId: revoked.targetOrganizationId,
        reason,
        beforeData: this.json({ status: before.status }),
        afterData: this.json({ status: revoked.status }),
      });
      return revoked;
    });
  }

  private async requireFounder(actor: Actor) {
    const authority =
      await this.prisma.platformAuthorityConfiguration.findUnique({
        where: { id: 'PRIMARY' },
        include: { founder: true, operatorOrganization: true },
      });
    if (!authority || authority.status !== 'ACTIVE')
      throw new ForbiddenException('Autorité plateforme active requise.');
    this.assertActiveAuthority(authority);
    if (actor.userId !== authority.founderUserId)
      throw new ForbiddenException('Founder requis.');
    return authority;
  }

  private assertActiveAuthority(authority: {
    status: string;
    operatorOrganizationId: string;
    founderUserId: string;
    operatorOrganization: {
      id: string;
      isActive: boolean;
      isInternal: boolean;
    };
    founder: {
      id: string;
      role: UserRole;
      organizationId: string;
      isActive: boolean;
    };
  }) {
    if (
      authority.status !== 'ACTIVE' ||
      !authority.operatorOrganization.isActive ||
      !authority.operatorOrganization.isInternal ||
      authority.operatorOrganization.id !== authority.operatorOrganizationId ||
      !authority.founder.isActive ||
      authority.founder.role !== UserRole.SUPER_ADMIN ||
      authority.founder.id !== authority.founderUserId ||
      authority.founder.organizationId !== authority.operatorOrganizationId
    )
      throw new ForbiddenException('Autorité plateforme incohérente.');
  }

  private json(value: Prisma.InputJsonObject): Prisma.InputJsonValue {
    return value;
  }
}
