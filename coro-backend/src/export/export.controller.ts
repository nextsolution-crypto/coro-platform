import { Controller, Post, Param, Body, UseGuards, Res, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { ExportService } from './export.service';
import type { ExportOptions } from './export.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('projects/:projectId/export')
@UseGuards(AuthGuard('jwt'))
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    private readonly auditService: AuditService,
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async exportPdf(
    @Param('projectId') projectId: string,
    @Body() options: ExportOptions,
    @Res() res: Response,
    @Request() req: any,
  ) {
    const result = await this.exportService.generatePdf(projectId, options, req.user.organizationId);

    await this.auditService.log({
      action: 'EXPORT',
      entityType: 'DOCUMENT',
      entityId: projectId,
      projectId,
      description: `Export PDF — langue(s): ${[options.language].filter(Boolean).join(', ')}`,
      metadata: { language: options.language, modules: options.selectedModules },
      userId: req.user.userId,
      organizationId: req.user.organizationId,
    });

    // Upload sur Spaces et sauvegarde des URLs
    const timestamp = Date.now();
    const updateData: any = { exportedAt: new Date() };

    try {
      if (result.fr) {
        const urlFr = await this.storageService.uploadFile(
          result.fr,
          `${projectId}-${timestamp}-FR.pdf`,
          'documents',
          'application/pdf',
        );
        updateData.exportedPdfFr = urlFr;
      }
      if (result.en) {
        const urlEn = await this.storageService.uploadFile(
          result.en,
          `${projectId}-${timestamp}-EN.pdf`,
          'documents',
          'application/pdf',
        );
        updateData.exportedPdfEn = urlEn;
      }
      await this.prisma.project.update({
        where: { id: projectId },
        data: updateData,
      });
    } catch (e) {
      console.error('Erreur upload PDF Spaces:', e);
    }

    // Si une seule langue demandée → retourne le PDF directement
    if (result.fr && !result.en) {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="document-FR.pdf"',
      });
      return res.send(result.fr);
    }
    if (result.en && !result.fr) {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="document-EN.pdf"',
      });
      return res.send(result.en);
    }
    // Si les deux langues → retourne en base64 JSON pour que le frontend gère 2 téléchargements
    return res.json({
      fr: result.fr ? result.fr.toString('base64') : null,
      en: result.en ? result.en.toString('base64') : null,
    });
  }
}