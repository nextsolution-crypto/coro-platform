import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdviserActor,
  assertEditableProject,
  lockEditableProject,
  projectAccessWhere,
} from '../auth/project-access';

type Module7Dto = { quartsData?: unknown; photosData?: unknown; extraData?: unknown };

/**
 * Module 7 (description du site, équipements, photos).
 * Audit M1-03 : même autorité que les modules 2, 3, 4 et 8 — affectation du
 * conseiller, projet actif, et écriture seulement en brouillon ou en cours.
 */
@Injectable()
export class Module7Service {
  constructor(private readonly prisma: PrismaService) {}

  private async readableProject(projectId: string, actor: AdviserActor) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ...projectAccessWhere(actor) },
      include: { module7: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    return project;
  }

  async getData(projectId: string, actor: AdviserActor) {
    const project = await this.readableProject(projectId, actor);
    return {
      quartsData: (project.module7?.quartsData as any) || {},
      photosData: (project.module7?.photosData as any) || {},
      extraData:  (project.module7?.extraData  as any) || {},
    };
  }

  async saveData(projectId: string, dto: Module7Dto, actor: AdviserActor) {
    if (!dto || typeof dto !== 'object' || Array.isArray(dto)) {
      throw new BadRequestException('Données du module 7 invalides.');
    }
    for (const key of ['quartsData', 'photosData', 'extraData'] as const) {
      const value = dto[key];
      if (value !== undefined && (value === null || typeof value !== 'object')) {
        throw new BadRequestException(`Champ ${key} invalide.`);
      }
    }
    await assertEditableProject(this.prisma, projectId, actor);

    await this.prisma.$transaction(async (tx) => {
      await lockEditableProject(tx, projectId, actor);
      const existing = await tx.module7Data.findUnique({ where: { projectId } });
      if (existing) {
        await tx.module7Data.update({
          where: { projectId },
          data: {
            quartsData: (dto.quartsData ?? existing.quartsData ?? {}) as any,
            photosData: (dto.photosData ?? existing.photosData ?? {}) as any,
            extraData:  (dto.extraData  ?? existing.extraData  ?? {}) as any,
          },
        });
      } else {
        await tx.module7Data.create({
          data: {
            projectId,
            quartsData: (dto.quartsData || {}) as any,
            photosData: (dto.photosData || {}) as any,
            extraData:  (dto.extraData  || {}) as any,
          },
        });
      }
    });

    return { success: true, updatedAt: new Date().toISOString() };
  }

  async getConfigForProject(projectId: string, actor: AdviserActor) {
    await this.readableProject(projectId, actor);
    const doc = await this.prisma.document.findFirst({
      where: { projectId },
      select: { content: true },
    });
    const content = (doc?.content as any) || {};
    return content.config || {};
  }
}
