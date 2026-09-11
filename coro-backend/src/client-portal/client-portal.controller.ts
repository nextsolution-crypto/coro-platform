import { Controller, Get, Post, Put, Body, Param, UseGuards, Request, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ClientPortalService } from './client-portal.service';
import { ClientJwtGuard } from './client-jwt.guard';
import { IncidentService } from '../occupancy/incident.service';

@Controller('client-portal')
@UseGuards(ClientJwtGuard)
export class ClientPortalController {
  constructor(
    private clientPortalService: ClientPortalService,
    private incidentService: IncidentService,
  ) {}

  @Get('dashboard')
  async getDashboard(@Request() req: any) {
    return this.clientPortalService.getDashboard(
      req.clientUser.clientId,
      req.clientUser.organizationId,
      req.clientUser.role,
      req.clientUser.buildingIds,
    );
  }

  @Get('projects')
  async getProjects(@Request() req: any) {
    return this.clientPortalService.getProjects(
      req.clientUser.clientId,
      req.clientUser.organizationId,
      req.clientUser.role,
      req.clientUser.buildingIds,
    );
  }

  @Get('projects/:id')
  async getProject(@Param('id') id: string, @Request() req: any) {
    return this.clientPortalService.getProject(
      id,
      req.clientUser.clientId,
      req.clientUser.organizationId,
      req.clientUser.role,
    );
  }

  @Get('activities')
  async getActivities(@Request() req: any) {
    return this.clientPortalService.getActivities(
      req.clientUser.clientId,
      req.clientUser.organizationId,
      req.clientUser.role,
      req.clientUser.buildingIds,
    );
  }

  @Post('projects/:id/sign')
  async signDocument(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { fullName: string; comment?: string },
  ) {
    return this.clientPortalService.signDocument(id, req.clientUser, {
      fullName: body.fullName,
      comment: body.comment,
      ipAddress: req.ip,
    });
  }

  @Get('projects/:id/sign-status')
  async getSignatureStatus(@Param('id') id: string, @Request() req: any) {
    return this.clientPortalService.getSignatureStatus(id, req.clientUser);
  }

  @Get('projects/:id/official/:lang')
  async downloadOfficialPdf(
    @Param('id') id: string,
    @Param('lang') lang: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const normalizedLang = lang.toLowerCase();

    if (!['fr', 'en'].includes(normalizedLang)) {
      return res.status(400).json({ message: 'Langue invalide' });
    }

    const project = await this.clientPortalService.getProject(
      id,
      req.clientUser.clientId,
      req.clientUser.organizationId,
      req.clientUser.role,
    );

    if (!project) {
      return res.status(404).json({ message: 'Projet introuvable' });
    }

    const pdfUrl =
      normalizedLang === 'fr' ? project.officialPdfFr : project.officialPdfEn;

    if (!pdfUrl) {
      return res.status(404).json({
        message: 'Le PDF officiel signé n’est pas encore disponible',
      });
    }

    try {
      const remoteResponse = await fetch(pdfUrl, { redirect: 'follow' });

      if (!remoteResponse.ok) {
        throw new Error(`Stockage distant: HTTP ${remoteResponse.status}`);
      }

      const pdfBuffer = Buffer.from(await remoteResponse.arrayBuffer());

      if (
        pdfBuffer.length < 5 ||
        pdfBuffer.subarray(0, 5).toString('ascii') !== '%PDF-'
      ) {
        throw new Error('Le fichier distant récupéré n’est pas un PDF valide');
      }

      const documentType = this.sanitizeFilenamePart(
        project.documentType || 'DOCUMENT',
      );
      const buildingName = this.sanitizeFilenamePart(
        project.building?.name || project.name || 'Projet',
      );
      const year =
        typeof project.year === 'number' && Number.isFinite(project.year)
          ? project.year
          : null;
      const filename = `${documentType}---${buildingName}${
        year ? `-${year}` : ''
      }-${normalizedLang.toUpperCase()}-OFFICIEL.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Length': String(pdfBuffer.length),
        'Content-Disposition': this.buildContentDisposition(filename),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Access-Control-Expose-Headers': 'Content-Disposition',
      });

      return res.send(pdfBuffer);
    } catch (error) {
      console.error(
        `[ClientPortalController] Échec téléchargement PDF officiel ${id}/${normalizedLang}:`,
        error,
      );

      return res.status(502).json({
        message: 'Impossible de récupérer le PDF officiel',
      });
    }
  }

  @Post('projects/:id/sign/retry')
  async retryOfficialPdfGeneration(@Param('id') id: string, @Request() req: any) {
    return this.clientPortalService.retryOfficialPdfGeneration(id, req.clientUser);
  }

  @Post('projects/:id/comments')
  async addComment(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { contenu: string },
  ) {
    return this.clientPortalService.addComment(
      id,
      req.clientUser,
      req.clientUser.organizationId,
      body.contenu,
    );
  }

  @Post('projects/:id/refuse')
  async refuseDocument(
    @Param('id') id: string,
    @Body() body: { comment: string },
    @Request() req: any,
  ) {
    return this.clientPortalService.refuseDocument(id, req.clientUser, body.comment);
  }

  @Get('projects/:id/comments')
  async getComments(@Param('id') id: string) {
    return this.clientPortalService.getComments(id);
  }

  @Post('projects/:id/engagement')
  async trackEngagement(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { event: string; device?: string; duration?: number },
  ) {
    return this.clientPortalService.trackEngagement({
      projectId: id,
      clientUserId: req.clientUser.sub,
      event: body.event,
      device: body.device,
      duration: body.duration,
    });
  }

  @Get('projects/:id/engagement')
  async getEngagement(@Param('id') id: string) {
    return this.clientPortalService.getEngagement(id);
  }

  @Get('projects/:id/versions')
  async getVersionHistory(@Param('id') id: string) {
    return this.clientPortalService.getProjectVersionHistory(id);
  }

  @Post('projects/:id/bookings')
  async createBooking(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { activityType: string; requestedDate: string; duration: number; participants?: number; comment?: string },
  ) {
    return this.clientPortalService.createBookingFromClient({
      projectId: id,
      clientUserId: req.clientUser.sub,
      activityType: body.activityType,
      requestedDate: new Date(body.requestedDate),
      duration: body.duration,
      participants: body.participants,
      comment: body.comment,
    });
  }

  @Get('bookings')
  async getMyBookings(@Request() req: any) {
    return this.clientPortalService.getBookingsForClient(req.clientUser.sub);
  }

  @Get('buildings')
  async getBuildings(@Request() req: any) {
    return this.clientPortalService.getBuildings(
      req.clientUser.clientId,
      req.clientUser.organizationId,
      req.clientUser.role,
      req.clientUser.buildingIds,
    );
  }

  @Get('buildings-readiness')
  async getBuildingsReadiness(@Request() req: any) {
    return this.clientPortalService.getBuildingsReadiness(
      req.clientUser.clientId,
      req.clientUser.organizationId,
      req.clientUser.role,
      req.clientUser.buildingIds,
    );
  }

  // ── Module Incident ──────────────────────────────────────────────────────

  @Post('incidents/trigger')
  async triggerIncident(@Body() body: any, @Request() req: any) {
    return this.incidentService.triggerIncident(body, req.clientUser.organizationId);
  }

  @Get('incidents/buildings/:buildingId/active')
  async getActiveIncident(@Param('buildingId') buildingId: string, @Request() req: any) {
    return this.incidentService.getActiveIncident(buildingId, req.clientUser.organizationId);
  }

  @Get('incidents/buildings/:buildingId/active-all')
  async getActiveIncidents(@Param('buildingId') buildingId: string, @Request() req: any) {
    return this.incidentService.getActiveIncidents(buildingId, req.clientUser.organizationId);
  }

  @Put('incidents/tasks/:taskId/uncomplete')
  async uncompleteStep(@Param('taskId') taskId: string, @Request() req: any) {
    return this.incidentService.uncompleteStep(taskId, req.clientUser.organizationId);
  }

  @Put('incidents/tasks/:taskId/acknowledge')
  async acknowledgeTask(@Param('taskId') taskId: string, @Request() req: any) {
    return this.incidentService.acknowledgeTask(taskId, req.clientUser.organizationId);
  }

  @Put('incidents/tasks/:taskId/complete')
  async completeTask(@Param('taskId') taskId: string, @Request() req: any) {
    return this.incidentService.completeTask(taskId, req.clientUser.organizationId);
  }

  @Post('incidents/:incidentId/logs')
  async addIncidentLog(@Param('incidentId') incidentId: string, @Body() body: any, @Request() req: any) {
    return this.incidentService.addLog(incidentId, body, req.clientUser.organizationId);
  }

  @Put('incidents/:incidentId/contain')
  async containIncident(@Param('incidentId') incidentId: string, @Request() req: any) {
    return this.incidentService.containIncident(incidentId, req.clientUser.organizationId);
  }

  @Put('incidents/:incidentId/resolve')
  async resolveIncident(@Param('incidentId') incidentId: string, @Body() body: any, @Request() req: any) {
    return this.incidentService.resolveIncident(incidentId, body, req.clientUser.organizationId);
  }

  @Get('incidents/buildings/:buildingId/history')
  async getIncidentHistory(@Param('buildingId') buildingId: string, @Request() req: any) {
    return this.incidentService.getIncidentHistory(buildingId, req.clientUser.organizationId);
  }

  @Get('notifications')
  async getNotifications(@Request() req: any) {
    return this.clientPortalService.getClientNotifications(
      req.clientUser.clientId,
      req.clientUser.organizationId,
      req.clientUser.role,
      req.clientUser.buildingIds,
    );
  }
  private sanitizeFilenamePart(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private buildContentDisposition(filename: string): string {
    const fallback = filename.replace(/[^\x20-\x7E]/g, '-');

    return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(
      filename,
    )}`;
  }

}
