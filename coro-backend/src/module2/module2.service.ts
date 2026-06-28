// ============================================================
// CORO — Module 2 Service
// Sauvegarde les données téléphoniques dans document.content
// ============================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveModule2Dto } from './dto/save-module2.dto';

@Injectable()
export class Module2Service {

  constructor(private readonly prisma: PrismaService) {}

  private async assertProjectOwnership(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, organizationId } });
    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }
  }

  // --------------------------------------------------------
  // GET — Récupère module2 depuis document.content JSON
  // --------------------------------------------------------
  async getModule2(projectId: string, organizationId: string) {
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
      module2: content.module2 || null,
    };
  }

  // --------------------------------------------------------
  // PUT — Sauvegarde module2 dans document.content JSON
  // --------------------------------------------------------
  async saveModule2(projectId: string, dto: SaveModule2Dto, organizationId: string) {
    await this.assertProjectOwnership(projectId, organizationId);

    const document = await this.prisma.document.findFirst({
      where: { projectId },
      select: { id: true, content: true },
    });

    if (!document) {
      throw new NotFoundException(`Document introuvable pour le projet ${projectId}`);
    }

    // Fusionne module2 dans le content existant sans écraser les autres modules
    const existingContent = (document.content as any) || {};
    const updatedContent = {
      ...existingContent,
      module2: {
        section2_1: dto.section2_1,
        section2_2: dto.section2_2,
        section2_3: dto.section2_3,
        section2_4: dto.section2_4,
        section2_5: dto.section2_5 || [],
        section2_5Enabled: dto.section2_5Enabled || false,
        internalEmergencyNumber: dto.internalEmergencyNumber || '',
        updatedAt: new Date().toISOString(),
      },
    };

    await this.prisma.document.update({
      where: { id: document.id },
      data: { content: updatedContent },
    });

    return {
      success: true,
      message: 'Module 2 sauvegardé',
      updatedAt: updatedContent.module2.updatedAt,
    };
  }
}