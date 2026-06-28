import { Controller, Post, Param, Body, UseGuards, Res, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { ExportService } from './export.service';
import type { ExportOptions } from './export.service';

@Controller('projects/:projectId/export')
@UseGuards(AuthGuard('jwt'))
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post()
  async exportPdf(
    @Param('projectId') projectId: string,
    @Body() options: ExportOptions,
    @Res() res: Response,
    @Request() req: any,
  ) {
    const result = await this.exportService.generatePdf(projectId, options, req.user.organizationId);

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