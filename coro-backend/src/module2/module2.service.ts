import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveModule2Dto } from './dto/save-module2.dto';
import { AdviserActor, projectAccessWhere } from '../auth/project-access';
import { DocumentEditorIntegrityService } from '../generator/document-editor-integrity.service';

@Injectable()
export class Module2Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrity: DocumentEditorIntegrityService,
  ) {}

  private async assertProjectAccess(projectId: string, actor: AdviserActor) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ...projectAccessWhere(actor), isActive: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
  }

  async getModule2(projectId: string, actor: AdviserActor) {
    await this.assertProjectAccess(projectId, actor);
    const document = await this.prisma.document.findFirst({
      where: { projectId },
      select: { id: true, content: true, lockVersion: true },
    });
    if (!document)
      throw new NotFoundException(
        `Document introuvable pour le projet ${projectId}`,
      );
    const content = this.integrity.sanitize((document.content as any) || {});
    return {
      documentId: document.id,
      module2: content.module2 || null,
      lockVersion: document.lockVersion,
    };
  }

  async saveModule2(
    projectId: string,
    dto: SaveModule2Dto & { expectedLockVersion?: number },
    actor: AdviserActor,
  ) {
    const updatedAt = new Date().toISOString();
    const result = await this.integrity.mutateProjectContent(
      projectId,
      actor,
      dto.expectedLockVersion,
      (existing) => ({
        content: {
          ...existing,
          module2: {
            section2_1: dto.section2_1,
            section2_2: dto.section2_2,
            section2_3: dto.section2_3,
            section2_4: dto.section2_4,
            section2_5: dto.section2_5 || [],
            section2_5Enabled: dto.section2_5Enabled || false,
            internalEmergencyNumber: dto.internalEmergencyNumber || '',
            updatedAt,
          },
        },
        value: null,
      }),
    );
    return {
      success: true,
      message: 'Module 2 sauvegardé',
      updatedAt,
      lockVersion: result.lockVersion,
    };
  }
}
