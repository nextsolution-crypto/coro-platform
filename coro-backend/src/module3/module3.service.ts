import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class Module3Service {

  constructor(private readonly prisma: PrismaService) {}

  private async assertProjectOwnership(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, organizationId } });
    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }
  }

  async getModule3(projectId: string, organizationId: string) {
    await this.assertProjectOwnership(projectId, organizationId);

    const document = await this.prisma.document.findFirst({
      where: { projectId },
      select: { id: true, content: true },
    });

    if (!document) {
      throw new NotFoundException(`Document introuvable pour le projet ${projectId}`);
    }

    const content = (document.content as any) || {};
    return {
      documentId: document.id,
      module3: content.module3 || null,
    };
  }

  async saveModule3(projectId: string, dto: any, organizationId: string) {
    await this.assertProjectOwnership(projectId, organizationId);

    const document = await this.prisma.document.findFirst({
      where: { projectId },
      select: { id: true, content: true },
    });

    if (!document) {
      throw new NotFoundException(`Document introuvable pour le projet ${projectId}`);
    }

    const existingContent = (document.content as any) || {};
    const updatedContent = {
      ...existingContent,
      module3: {
        orgRoles:     dto.orgRoles     || [],
        members:      dto.members      || [],
        activeShifts: dto.activeShifts || ['jour'],
        customRoles:  dto.customRoles  || [],
        updatedAt:    new Date().toISOString(),
      },
    };

    await this.prisma.document.update({
      where: { id: document.id },
      data: { content: updatedContent },
    });

    return {
      success: true,
      message: 'Module 3 sauvegardé',
      updatedAt: updatedContent.module3.updatedAt,
    };
  }
}