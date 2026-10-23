import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { projectAccessWhere } from '../auth/project-access';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeActor } from './knowledge.types';

export interface AuthorizedKnowledgeScope {
  organizationId: string;
  buildingIds?: string[];
  visibility?: 'shared';
  internalProjectAccess?: Prisma.ProjectWhereInput;
}

@Injectable()
export class KnowledgeAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async scope(actor: KnowledgeActor): Promise<AuthorizedKnowledgeScope> {
    if (actor.type === 'INTERNAL_USER') {
      const user = await this.prisma.user.findFirst({
        where: {
          id: actor.id,
          organizationId: actor.organizationId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!user) throw new ForbiddenException('Identite interne inactive.');
      return {
        organizationId: actor.organizationId,
        internalProjectAccess: projectAccessWhere({
          userId: actor.id,
          organizationId: actor.organizationId,
          role: actor.role,
        }),
      };
    }

    const client = await this.prisma.clientUser.findFirst({
      where: {
        id: actor.id,
        organizationId: actor.organizationId,
        isActive: true,
      },
      select: { role: true, buildingIds: true },
    });
    if (!client) throw new ForbiddenException('Identite client inactive.');
    if (client.role === 'CLIENT_CORPORATE')
      return { organizationId: actor.organizationId, visibility: 'shared' };

    const now = new Date();
    const assignments = await this.prisma.customerPortfolioAssignment.findMany({
      where: {
        organizationId: actor.organizationId,
        subjectType: 'CLIENT_USER',
        clientUserId: actor.id,
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
    const portfolioIds = assignments
      .filter((item) => item.scope === 'PORTFOLIO' && item.portfolioId)
      .map((item) => item.portfolioId!);
    const regionIds = assignments
      .filter((item) => item.scope === 'REGION' && item.regionId)
      .map((item) => item.regionId!);
    const direct = assignments
      .filter((item) => item.scope === 'BUILDING' && item.buildingId)
      .map((item) => item.buildingId!);
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
    const buildingIds = [
      ...new Set([
        ...client.buildingIds,
        ...direct,
        ...memberships.map((item) => item.buildingId),
      ]),
    ];
    return {
      organizationId: actor.organizationId,
      buildingIds,
      visibility: 'shared',
    };
  }

  async assertInternalProject(actor: KnowledgeActor, projectId: string) {
    if (actor.type !== 'INTERNAL_USER')
      throw new ForbiddenException('Autorite interne requise pour indexer.');
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        ...projectAccessWhere({
          userId: actor.id,
          organizationId: actor.organizationId,
          role: actor.role,
        }),
      },
      select: { id: true },
    });
    if (!project) throw new ForbiddenException('Projet non autorise.');
  }

  where(scope: AuthorizedKnowledgeScope): Prisma.ProjectFileWhereInput {
    return {
      organizationId: scope.organizationId,
      ...(scope.visibility ? { visibility: scope.visibility } : {}),
      project: {
        organizationId: scope.organizationId,
        ...(scope.internalProjectAccess ?? {}),
        ...(scope.buildingIds !== undefined
          ? { buildingId: { in: scope.buildingIds } }
          : {}),
      },
    };
  }
}
