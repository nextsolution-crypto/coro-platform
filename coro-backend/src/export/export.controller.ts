import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Res,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { ExportService } from './export.service';
import type { ExportOptions } from './export.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('projects/:projectId/export')
@UseGuards(AuthGuard('jwt'))
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async exportPdf(
    @Param('projectId') projectId: string,
    @Body() options: ExportOptions,
    @Res() res: Response,
    @Request() req: any,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: req.user.organizationId,
      },
      include: {
        building: true,
      },
    });

    if (!project) {
      return res.status(404).json({
        message: 'Projet introuvable',
      });
    }

    try {
      // Une seule génération par demande.
      // Aucun upload secondaire, aucune régénération APERÇU.
      const result = await this.exportService.generatePdf(
        projectId,
        options,
        req.user.organizationId,
      );

      await this.auditService.log({
        action: 'EXPORT',
        entityType: 'DOCUMENT',
        entityId: projectId,
        projectId,
        description: `Export PDF — langue(s): ${options.language}`,
        metadata: {
          language: options.language,
          modules: options.selectedModules,
          isPreview: options.isPreview === true,
        },
        userId: req.user.userId,
        organizationId: req.user.organizationId,
      });

      const documentType = this.sanitizeFilenamePart(
        project.documentType || 'DOCUMENT',
      );

      const buildingName = this.sanitizeFilenamePart(
        project.building?.name || project.name || 'Projet',
      );

      const year = this.extractProjectYear(project);

      const baseFilename = [
        documentType,
        buildingName,
        year ? String(year) : null,
      ]
        .filter(Boolean)
        .join('---');

      // Une seule langue → fichier PDF direct.
      if (result.fr && !result.en) {
        const filename = `${baseFilename}-FR.pdf`;

        res.set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': this.buildContentDisposition(filename),
          'Cache-Control': 'no-store',
        });

        return res.send(result.fr);
      }

      if (result.en && !result.fr) {
        const filename = `${baseFilename}-EN.pdf`;

        res.set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': this.buildContentDisposition(filename),
          'Cache-Control': 'no-store',
        });

        return res.send(result.en);
      }

      // Deux langues → JSON base64.
      // Les noms proposés sont retournés au frontend pour garantir des téléchargements
      // cohérents même lorsque le navigateur traite deux fichiers séparément.
      return res.json({
        fr: result.fr ? result.fr.toString('base64') : null,
        en: result.en ? result.en.toString('base64') : null,
        filenames: {
          fr: result.fr ? `${baseFilename}-FR.pdf` : null,
          en: result.en ? `${baseFilename}-EN.pdf` : null,
        },
      });
    } catch (error) {
      console.error(
        `[ExportController] Échec export PDF projet ${projectId}:`,
        error,
      );

      return res.status(500).json({
        message: 'Erreur lors de la génération du PDF',
        detail:
          error instanceof Error
            ? error.message
            : 'Erreur inconnue lors de la génération du document',
      });
    }
  }

  private sanitizeFilenamePart(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private extractProjectYear(project: any): number | null {
    if (typeof project.year === 'number' && Number.isFinite(project.year)) {
      return project.year;
    }

    if (project.createdAt) {
      const date = new Date(project.createdAt);
      if (!Number.isNaN(date.getTime())) {
        return date.getFullYear();
      }
    }

    return null;
  }

  private buildContentDisposition(filename: string): string {
    const fallback = filename.replace(/[^\x20-\x7E]/g, '-');

    return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(
      filename,
    )}`;
  }
}
