import { Injectable, NotFoundException } from '@nestjs/common';
import { PlatformPermission, Prisma } from '@prisma/client';
import { PlatformAuthorityService } from '../auth/platform-authority.service';
import { AdviserActor, projectAccessWhere } from '../auth/project-access';
import { PrismaService } from '../prisma/prisma.service';

export interface ExerciseReportResourceScope {
  id: string;
  organizationId: string;
  projectId: string;
  buildingId: string;
  authorization: 'CUSTOMER_PROJECT_SCOPE' | 'PLATFORM_AUTHORITY';
}

@Injectable()
export class ExerciseReportAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authority: PlatformAuthorityService,
  ) {}

  async report(
    id: string,
    actor: AdviserActor,
    permission: PlatformPermission,
  ): Promise<ExerciseReportResourceScope> {
    const canonical = await this.prisma.exerciseReport.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        projectId: true,
        buildingId: true,
        project: {
          select: { organizationId: true, buildingId: true, isActive: true },
        },
        building: { select: { organizationId: true, isActive: true } },
      },
    });
    if (
      !canonical ||
      !canonical.project.isActive ||
      !canonical.building.isActive ||
      canonical.project.organizationId !== canonical.organizationId ||
      canonical.building.organizationId !== canonical.organizationId ||
      canonical.project.buildingId !== canonical.buildingId
    ) {
      throw this.notFound();
    }
    if (actor.organizationId === canonical.organizationId) {
      const accessible = await this.prisma.exerciseReport.count({
        where: { id, project: { is: projectAccessWhere(actor) } },
      });
      if (accessible !== 1) throw this.notFound();
      return { ...this.scope(canonical), authorization: 'CUSTOMER_PROJECT_SCOPE' };
    }
    try {
      await this.authority.requirePermission(
        actor,
        permission,
        canonical.organizationId,
      );
    } catch {
      throw this.notFound();
    }
    return { ...this.scope(canonical), authorization: 'PLATFORM_AUTHORITY' };
  }

  /** Governed lifecycle/export path: customer identities never inherit
   * Platform Authority from their tenant role. The target tenant is resolved
   * from the canonical report before the exact permission is evaluated. */
  async governedReport(
    id: string,
    actor: AdviserActor,
    permission: PlatformPermission,
  ): Promise<ExerciseReportResourceScope> {
    const canonical = await this.prisma.exerciseReport.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        projectId: true,
        buildingId: true,
        project: { select: { organizationId: true, buildingId: true, isActive: true } },
        building: { select: { organizationId: true, isActive: true } },
      },
    });
    if (
      !canonical ||
      !canonical.project.isActive ||
      !canonical.building.isActive ||
      canonical.project.organizationId !== canonical.organizationId ||
      canonical.building.organizationId !== canonical.organizationId ||
      canonical.project.buildingId !== canonical.buildingId
    ) throw this.notFound();
    try {
      await this.authority.requirePermission(actor, permission, canonical.organizationId);
    } catch {
      throw this.notFound();
    }
    return { ...this.scope(canonical), authorization: 'PLATFORM_AUTHORITY' };
  }

  async activity(
    id: string,
    actor: AdviserActor,
    permission: PlatformPermission,
  ): Promise<ExerciseReportResourceScope> {
    const canonical = await this.prisma.projectActivity.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        projectId: true,
        project: {
          select: { organizationId: true, buildingId: true, isActive: true },
        },
      },
    });
    if (
      !canonical ||
      !canonical.project.isActive ||
      canonical.project.organizationId !== canonical.organizationId
    ) {
      throw this.notFound();
    }
    if (actor.organizationId === canonical.organizationId) {
      const accessible = await this.prisma.projectActivity.count({
        where: { id, project: { is: projectAccessWhere(actor) } },
      });
      if (accessible !== 1) throw this.notFound();
      return {
        id,
        organizationId: canonical.organizationId,
        projectId: canonical.projectId,
        buildingId: canonical.project.buildingId,
        authorization: 'CUSTOMER_PROJECT_SCOPE',
      };
    }
    try {
      await this.authority.requirePermission(
        actor,
        permission,
        canonical.organizationId,
      );
    } catch {
      throw this.notFound();
    }
    return {
      id,
      organizationId: canonical.organizationId,
      projectId: canonical.projectId,
      buildingId: canonical.project.buildingId,
      authorization: 'PLATFORM_AUTHORITY',
    };
  }

  private scope(resource: {
    id: string;
    organizationId: string;
    projectId: string;
    buildingId: string;
  }) {
    return {
      id: resource.id,
      organizationId: resource.organizationId,
      projectId: resource.projectId,
      buildingId: resource.buildingId,
    };
  }

  private notFound() {
    return new NotFoundException('Rapport exercice introuvable');
  }
}
