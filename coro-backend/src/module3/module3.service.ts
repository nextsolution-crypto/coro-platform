import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdviserActor, projectAccessWhere } from '../auth/project-access';
import { DocumentEditorIntegrityService } from '../generator/document-editor-integrity.service';

@Injectable()
export class Module3Service {
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

  async getModule3(projectId: string, actor: AdviserActor) {
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
      module3: content.module3 || null,
      lockVersion: document.lockVersion,
    };
  }

  async saveModule3(projectId: string, dto: any, actor: AdviserActor) {
    const updatedAt = new Date().toISOString();
    const result = await this.integrity.mutateProjectContent(
      projectId,
      actor,
      dto.expectedLockVersion,
      (existing) => ({
        content: {
          ...existing,
          module3: {
            orgRoles: dto.orgRoles || [],
            members: dto.members || [],
            activeShifts: dto.activeShifts || ['jour'],
            customRoles: dto.customRoles || [],
            updatedAt,
          },
        },
        value: null,
      }),
    );
    return {
      success: true,
      message: 'Module 3 sauvegardé',
      updatedAt,
      lockVersion: result.lockVersion,
    };
  }
}
