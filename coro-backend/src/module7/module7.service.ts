import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class Module7Service {
  constructor(private readonly prisma: PrismaService) {}

  async getData(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { module7: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');

    return {
      quartsData: (project.module7?.quartsData as any) || {},
      photosData: (project.module7?.photosData as any) || {},
      extraData:  (project.module7?.extraData  as any) || {},
    };
  }

  async saveData(projectId: string, dto: {
    quartsData?: any;
    photosData?: any;
    extraData?:  any;
  }) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { module7: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');

    if (project.module7) {
      await this.prisma.module7Data.update({
        where: { projectId },
        data: {
          quartsData: dto.quartsData ?? project.module7.quartsData ?? {},
          photosData: dto.photosData ?? project.module7.photosData ?? {},
          extraData:  dto.extraData  ?? project.module7.extraData  ?? {},
        },
      });
    } else {
      await this.prisma.module7Data.create({
        data: {
          projectId,
          quartsData: dto.quartsData || {},
          photosData: dto.photosData || {},
          extraData:  dto.extraData  || {},
        },
      });
    }

    return { success: true, updatedAt: new Date().toISOString() };
  }

  async getConfigForProject(projectId: string) {
    // Récupère la config sauvegardée dans localStorage via le document
    const doc = await this.prisma.document.findFirst({
      where: { projectId },
      select: { content: true },
    });
    const content = (doc?.content as any) || {};
    return content.config || {};
  }
}