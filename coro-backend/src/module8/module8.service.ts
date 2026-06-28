import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class Module8Service {
  constructor(private readonly prisma: PrismaService) {}

  private async assertProjectOwnership(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, organizationId } });
    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }
  }

  async getData(projectId: string, organizationId: string) {
    await this.assertProjectOwnership(projectId, organizationId);

    const doc = await this.prisma.document.findFirst({
      where: { projectId },
      select: { content: true },
    });

    const content = (doc?.content as any) || {};
    return { module8: content.module8 || null };
  }

  async saveData(projectId: string, dto: any, organizationId: string) {
    await this.assertProjectOwnership(projectId, organizationId);

    const doc = await this.prisma.document.findFirst({
      where: { projectId },
    });
    if (!doc) throw new NotFoundException('Document introuvable');

    const content = (doc.content as any) || {};

    await this.prisma.document.update({
      where: { id: doc.id },
      data: {
        content: {
          ...content,
          module8: dto,
        },
      },
    });

    return { success: true, updatedAt: new Date().toISOString() };
  }
}