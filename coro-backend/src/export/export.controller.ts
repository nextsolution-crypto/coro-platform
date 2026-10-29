import { Body, Controller, Get, Param, Post, Request, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import { projectAccessWhere } from '../auth/project-access';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { DocumentPdfExportService } from './document-pdf-export.service';
import { ExportService, type ExportOptions } from './export.service';

@Controller('projects/:projectId/export')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly documentPdfExports: DocumentPdfExportService,
  ) {}

  @Post()
  async exportPdf(@Param('projectId') projectId: string, @Body() options: ExportOptions & { idempotencyKey?: string }, @Res() res: Response, @Request() req: any) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, ...projectAccessWhere(req.user) }, include: { building: true } });
    if (!project) return res.status(404).json({ message: 'Projet introuvable' });
    if (options.isPreview === true) {
      const result = await this.exportService.generatePdf(projectId, { ...options, isPreview: true }, req.user.organizationId);
      await this.auditService.log({
        action: 'EXPORT', entityType: 'DOCUMENT_PDF_PREVIEW', entityId: projectId, projectId,
        description: `Aperçu PDF — langue(s): ${options.language}`,
        metadata: { language: options.language, modules: options.selectedModules },
        userId: req.user.userId, organizationId: req.user.organizationId,
      });
      return this.sendRenderedResult(res, result, project);
    }
    const result = await this.documentPdfExports.request(projectId, options as ExportOptions & { idempotencyKey: string }, req.user);
    return res.status(result.status === 'AVAILABLE' ? 201 : 202).json(result);
  }

  @Get('requests/:exportId')
  exportStatus(@Param('projectId') projectId: string, @Param('exportId') exportId: string, @Request() req: any) {
    return this.documentPdfExports.get(projectId, exportId, req.user);
  }

  @Post('requests/:exportId/retry')
  retryExport(@Param('projectId') projectId: string, @Param('exportId') exportId: string, @Request() req: any) {
    return this.documentPdfExports.retry(projectId, exportId, req.user);
  }

  @Get('requests/:exportId/download/:lang')
  async downloadExport(@Param('projectId') projectId: string, @Param('exportId') exportId: string, @Param('lang') lang: string, @Res() res: Response, @Request() req: any) {
    const result = await this.documentPdfExports.download(projectId, exportId, lang, req.user);
    res.set({
      'Content-Type': 'application/pdf', 'Content-Length': String(result.bytes.length),
      'Content-Disposition': this.buildContentDisposition(result.fileName), 'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff', 'X-Document-SHA256': result.sha256,
      'Access-Control-Expose-Headers': 'Content-Disposition, X-Document-SHA256',
    });
    return res.send(result.bytes);
  }

  @Get('official/:lang')
  async downloadOfficialPdf(@Param('projectId') projectId: string, @Param('lang') lang: string, @Res() res: Response, @Request() req: any) {
    const normalizedLang = lang.toLowerCase();
    if (!['fr', 'en'].includes(normalizedLang)) return res.status(400).json({ message: 'Langue invalide' });
    const project = await this.prisma.project.findFirst({ where: { id: projectId, ...projectAccessWhere(req.user) }, include: { building: true } });
    if (!project) return res.status(404).json({ message: 'Projet introuvable' });
    const pdfUrl = normalizedLang === 'fr' ? project.officialPdfFr : project.officialPdfEn;
    if (!pdfUrl) return res.status(404).json({ message: 'Le PDF officiel signé n’est pas encore disponible' });
    try {
      const pdfBuffer = await this.storageService.downloadOfficialPdfReference(pdfUrl);
      const documentType = this.sanitizeFilenamePart(project.documentType || 'DOCUMENT');
      const buildingName = this.sanitizeFilenamePart(project.building?.name || project.name || 'Projet');
      const year = this.extractProjectYear(project);
      const filename = `${documentType}---${buildingName}${year ? `-${year}` : ''}-${normalizedLang.toUpperCase()}-OFFICIEL.pdf`;
      res.set({ 'Content-Type': 'application/pdf', 'Content-Length': String(pdfBuffer.length), 'Content-Disposition': this.buildContentDisposition(filename), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Access-Control-Expose-Headers': 'Content-Disposition' });
      return res.send(pdfBuffer);
    } catch (error) {
      console.error(`[ExportController] Échec téléchargement PDF officiel ${projectId}/${normalizedLang}:`, error);
      return res.status(502).json({ message: 'Impossible de récupérer le PDF officiel' });
    }
  }

  private sendRenderedResult(res: Response, result: { fr?: Buffer; en?: Buffer }, project: any) {
    const documentType = this.sanitizeFilenamePart(project.documentType || 'DOCUMENT');
    const buildingName = this.sanitizeFilenamePart(project.building?.name || project.name || 'Projet');
    const year = this.extractProjectYear(project);
    const baseFilename = `${documentType}---${buildingName}${year ? `-${year}` : ''}`;
    if (result.fr && !result.en) {
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': this.buildContentDisposition(`${baseFilename}-FR-APERCU.pdf`), 'Cache-Control': 'no-store', 'Access-Control-Expose-Headers': 'Content-Disposition' });
      return res.status(200).send(result.fr);
    }
    if (result.en && !result.fr) {
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': this.buildContentDisposition(`${baseFilename}-EN-PREVIEW.pdf`), 'Cache-Control': 'no-store', 'Access-Control-Expose-Headers': 'Content-Disposition' });
      return res.status(200).send(result.en);
    }
    return res.status(200).json({
      fr: result.fr?.toString('base64') ?? null, en: result.en?.toString('base64') ?? null,
      filenames: { fr: result.fr ? `${baseFilename}-FR-APERCU.pdf` : null, en: result.en ? `${baseFilename}-EN-PREVIEW.pdf` : null },
    });
  }

  private sanitizeFilenamePart(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }
  private extractProjectYear(project: any): number | null {
    if (typeof project.year === 'number' && Number.isFinite(project.year)) return project.year;
    if (project.createdAt) { const date = new Date(project.createdAt); if (!Number.isNaN(date.getTime())) return date.getFullYear(); }
    return null;
  }
  private buildContentDisposition(filename: string): string {
    const fallback = filename.replace(/[^\x20-\x7E]/g, '-');
    return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
  }
}
