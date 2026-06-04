import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getAllProcedures, getProcedureById } from '../generator/module4.templates';

@Injectable()
export class Module4Service {

  constructor(private readonly prisma: PrismaService) {}

  // ── GET module4 sauvegardé ─────────────────────────────

  async getModule4(projectId: string) {
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
      module4: content.module4 || null,
    };
  }

  // ── GET bibliothèque complète (résumé) ─────────────────

  async getLibrary() {
    return {
      procedures: getAllProcedures().map(p => ({
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

  // ── GET procédure complète avec roleSections ───────────

  async getProcedureFull(procedureId: string) {
    const proc = getProcedureById(procedureId);
    if (!proc) {
      throw new NotFoundException(`Procédure ${procedureId} introuvable`);
    }
    return proc;
  }

  // ── PUT sauvegarde module4 ─────────────────────────────

  async saveModule4(projectId: string, dto: any) {
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
      module4: {
        customProcedureIds: dto.customProcedureIds    || [],
        procedureOverrides: dto.procedureOverrides    || {},
        updatedAt:          new Date().toISOString(),
      },
    };

    await this.prisma.document.update({
      where: { id: document.id },
      data:  { content: updatedContent },
    });

    return {
      success:   true,
      message:   'Module 4 sauvegardé',
      updatedAt: updatedContent.module4.updatedAt,
    };
  }
}