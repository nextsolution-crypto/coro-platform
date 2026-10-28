import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  getAllProcedures,
  getProcedureById,
} from '../generator/module4.templates';
import { AdviserActor, projectAccessWhere } from '../auth/project-access';
import { DocumentEditorIntegrityService } from '../generator/document-editor-integrity.service';

@Injectable()
export class Module4Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrity: DocumentEditorIntegrityService,
  ) {}

  private async assertProjectOwnership(projectId: string, actor: AdviserActor) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ...projectAccessWhere(actor), isActive: true },
    });
    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }
  }

  // ── GET module4 sauvegardé ─────────────────────────────

  async getModule4(projectId: string, actor: AdviserActor) {
    await this.assertProjectOwnership(projectId, actor);

    const document = await this.prisma.document.findFirst({
      where: { projectId },
      select: { id: true, content: true, lockVersion: true },
    });
    if (!document) {
      throw new NotFoundException(
        `Document introuvable pour le projet ${projectId}`,
      );
    }
    const content = this.integrity.sanitize((document.content as any) || {});
    return {
      documentId: document.id,
      module4: content.module4 || null,
      lockVersion: document.lockVersion,
    };
  }

  // ── GET bibliothèque complète (résumé) — partagée, pas liée à un projet ──

  async getLibrary() {
    return {
      procedures: getAllProcedures().map((p) => ({
        id: p.id,
        code: p.code,
        titleFR: p.titleFR,
        titleEN: p.titleEN,
        icon: p.icon,
        headerColor: p.headerColor,
        activationRule: p.activationRule,
        documentTypes: p.documentTypes,
        phase: p.phase,
        roleCount: p.roleSections.length,
      })),
    };
  }

  // ── GET procédure complète avec roleSections — partagée, pas liée à un projet ──

  async getProcedureFull(procedureId: string) {
    const proc = getProcedureById(procedureId);
    if (!proc) {
      throw new NotFoundException(`Procédure ${procedureId} introuvable`);
    }
    return proc;
  }

  // ── PUT sauvegarde module4 ─────────────────────────────

  async saveModule4(projectId: string, dto: any, actor: AdviserActor) {
    await this.assertProjectOwnership(projectId, actor);

    const document = await this.prisma.document.findFirst({
      where: { projectId },
      select: { id: true, content: true },
    });
    if (!document) {
      throw new NotFoundException(
        `Document introuvable pour le projet ${projectId}`,
      );
    }

    const existingContent = (document.content as any) || {};

    const updatedModule4 = {
      ...existingContent.module4,
      ...(dto.customProcedureIds !== undefined && {
        customProcedureIds: dto.customProcedureIds,
        procedureOverrides: dto.procedureOverrides || {},
      }),
      ...(dto.module4?.pcaContacts !== undefined && {
        pcaContacts: dto.module4.pcaContacts,
      }),
      updatedAt: new Date().toISOString(),
    };

    const updatedContent = {
      ...existingContent,
      module4: updatedModule4,
    };

    const result = await this.integrity.mutateProjectContent(
      projectId,
      actor,
      dto.expectedLockVersion,
      (current) => ({
        content: {
          ...current,
          module4: {
            ...current.module4,
            ...(dto.customProcedureIds !== undefined && {
              customProcedureIds: dto.customProcedureIds,
              procedureOverrides: dto.procedureOverrides || {},
            }),
            ...(dto.module4?.pcaContacts !== undefined && {
              pcaContacts: dto.module4.pcaContacts,
            }),
            updatedAt: updatedContent.module4.updatedAt,
          },
        },
        value: null,
      }),
    );

    return {
      success: true,
      message: 'Module 4 sauvegardé',
      updatedAt: updatedContent.module4.updatedAt,
      lockVersion: result.lockVersion,
    };
  }
}
