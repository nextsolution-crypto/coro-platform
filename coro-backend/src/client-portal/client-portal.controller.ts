import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ClientPortalService } from './client-portal.service';
import { ConfigurePopulationProgramDto } from '../population/dto/population-program.dto';
import { CreatePopulationAlertDraftDto } from '../population/dto/create-population-alert-draft.dto';
import { CreatePopulationFollowUpDto } from '../population/dto/create-population-follow-up.dto';
import { UpdatePopulationAlertDraftDto } from '../population/dto/update-population-alert-draft.dto';
import { ClientJwtGuard } from './client-jwt.guard';
import { IncidentService } from '../occupancy/incident.service';
import { OccupancyEmployeesService } from '../occupancy/occupancy-employees.service';
import { OccupancyService } from '../occupancy/occupancy.service';
import { CorrectiveActionsService } from '../occupancy/corrective-actions.service';
import {
  CreateCorrectiveActionDto,
  UpdateCorrectiveActionDto,
} from '../occupancy/dto/corrective-action.dto';
import { CorrectiveActionActor } from '../occupancy/corrective-actions.service';

interface CorrectiveActionRequest {
  clientUser: CorrectiveActionActor;
}

@Controller('client-portal')
@UseGuards(ClientJwtGuard)
export class ClientPortalController {
  constructor(
    private clientPortalService: ClientPortalService,
    private incidentService: IncidentService,
    private occupancyEmployeesService: OccupancyEmployeesService,
    private occupancyService: OccupancyService,
    private correctiveActionsService: CorrectiveActionsService,
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
  async retryOfficialPdfGeneration(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.clientPortalService.retryOfficialPdfGeneration(
      id,
      req.clientUser,
    );
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
    return this.clientPortalService.refuseDocument(
      id,
      req.clientUser,
      body.comment,
    );
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
    @Body()
    body: {
      activityType: string;
      requestedDate: string;
      duration: number;
      participants?: number;
      comment?: string;
    },
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

  // ── Sentinelle Population ────────────────────────────────────────────────

  @Get('buildings/:buildingId/population/status')
  async getPopulationStatus(
    @Param('buildingId') buildingId: string,
    @Request() req: any,
  ) {
    return this.clientPortalService.getPopulationStatus(
      buildingId,
      req.clientUser,
    );
  }

  @Get('buildings/:buildingId/population/configuration')
  async getPopulationConfiguration(
    @Param('buildingId') buildingId: string,
    @Request() req: any,
  ) {
    return this.clientPortalService.getPopulationConfiguration(
      buildingId,
      req.clientUser,
    );
  }

  @Put('buildings/:buildingId/population/configuration')
  async configurePopulationProgram(
    @Param('buildingId') buildingId: string,
    @Body() dto: ConfigurePopulationProgramDto,
    @Request() req: any,
  ) {
    return this.clientPortalService.configurePopulationProgram(
      buildingId,
      dto,
      req.clientUser,
    );
  }

  @Post('buildings/:buildingId/population/ready')
  async markPopulationReady(
    @Param('buildingId') buildingId: string,
    @Request() req: any,
  ) {
    return this.clientPortalService.markPopulationReady(
      buildingId,
      req.clientUser,
    );
  }

  @Post('buildings/:buildingId/population/activate')
  async activatePopulationProgram(
    @Param('buildingId') buildingId: string,
    @Request() req: any,
  ) {
    return this.clientPortalService.activatePopulationProgram(
      buildingId,
      req.clientUser,
    );
  }

  @Post('buildings/:buildingId/population/suspend')
  async suspendPopulationProgram(
    @Param('buildingId') buildingId: string,
    @Request() req: any,
  ) {
    return this.clientPortalService.suspendPopulationProgram(
      buildingId,
      req.clientUser,
    );
  }

  @Post('buildings/:buildingId/population/archive')
  async archivePopulationProgram(
    @Param('buildingId') buildingId: string,
    @Request() req: any,
  ) {
    return this.clientPortalService.archivePopulationProgram(
      buildingId,
      req.clientUser,
    );
  }

    /**
   * Scénarios RUE disponibles pour Sentinelle Population.
   *
   * Cette route est accessible pendant la préparation du programme :
   * elle n'exige donc pas que Sentinelle Population soit déjà ACTIVE.
   */
  @Get('buildings/:buildingId/population/scenarios')
  async getPopulationScenarios(
    @Param('buildingId') buildingId: string,
    @Request() req: any,
  ) {
    return this.clientPortalService.getPopulationScenarios(
      buildingId,
      req.clientUser,
    );
  }

  /**
   * Aperçu agrégé de la population ciblée par les zones d'impact
   * d'un scénario RUE.
   *
   * Aucune donnée nominative d'abonné n'est exposée par cette route.
   */
  @Get('buildings/:buildingId/population/scenarios/:scenarioId/preview')
  async getPopulationScenarioPreview(
    @Param('buildingId') buildingId: string,
    @Param('scenarioId') scenarioId: string,
    @Request() req: any,
  ) {
    return this.clientPortalService.getPopulationScenarioPreview(
      buildingId,
      scenarioId,
      req.clientUser,
    );
  }

  @Post('buildings/:buildingId/population/alerts/draft')
  async createPopulationAlertDraft(
    @Param('buildingId') buildingId: string,
    @Body() dto: CreatePopulationAlertDraftDto,
    @Request() req: any,
  ) {
    return this.clientPortalService.createPopulationAlertDraft(
      buildingId,
      dto,
      req.clientUser,
    );
  }

  @Get(
    'buildings/:buildingId/population/alerts/:alertId/delivery-status',
  )
  async getPopulationAlertDeliveryStatus(
    @Param('buildingId') buildingId: string,
    @Param('alertId') alertId: string,
    @Request() req: any,
  ) {
    return this.clientPortalService.getPopulationAlertDeliveryStatus(
      buildingId,
      alertId,
      req.clientUser,
    );
  }

  @Get('buildings/:buildingId/population/alerts/:alertId')
  async getPopulationAlert(
    @Param('buildingId') buildingId: string,
    @Param('alertId') alertId: string,
    @Request() req: any,
  ) {
    return this.clientPortalService.getPopulationAlert(
      buildingId,
      alertId,
      req.clientUser,
    );
  }

  @Put('buildings/:buildingId/population/alerts/:alertId/draft')
  async updatePopulationAlertDraft(
    @Param('buildingId') buildingId: string,
    @Param('alertId') alertId: string,
    @Body() dto: UpdatePopulationAlertDraftDto,
    @Request() req: any,
  ) {
    return this.clientPortalService.updatePopulationAlertDraft(
      buildingId,
      alertId,
      dto,
      req.clientUser,
    );
  }

  @Post('buildings/:buildingId/population/alerts/:alertId/refresh-targeting')
  async refreshPopulationAlertDraftTargeting(
    @Param('buildingId') buildingId: string,
    @Param('alertId') alertId: string,
    @Request() req: any,
  ) {
    return this.clientPortalService.refreshPopulationAlertDraftTargeting(
      buildingId,
      alertId,
      req.clientUser,
    );
  }

  @Post('buildings/:buildingId/population/alerts/:alertId/ready')
  async markPopulationAlertReady(
    @Param('buildingId') buildingId: string,
    @Param('alertId') alertId: string,
    @Request() req: any,
  ) {
    return this.clientPortalService.markPopulationAlertReady(
      buildingId,
      alertId,
      req.clientUser,
    );
  }

  @Post('buildings/:buildingId/population/alerts/:alertId/approve')
  async approvePopulationAlert(
    @Param('buildingId') buildingId: string,
    @Param('alertId') alertId: string,
    @Request() req: any,
  ) {
    return this.clientPortalService.approvePopulationAlert(
      buildingId,
      alertId,
      req.clientUser,
    );
  }

  @Post('buildings/:buildingId/population/alerts/:alertId/freeze-recipients')
  async freezePopulationAlertRecipients(
    @Param('buildingId') buildingId: string,
    @Param('alertId') alertId: string,
    @Request() req: any,
  ) {
    return this.clientPortalService.freezePopulationAlertRecipients(
      buildingId,
      alertId,
      req.clientUser,
    );
  }

    /**
   * DÃ©clenche la diffusion d'une alerte Population approuvÃ©e
   * dont les destinataires ont dÃ©jÃ  Ã©tÃ© figÃ©s.
   *
   * Le contrÃ´leur n'accÃ¨de jamais directement aux primitives
   * internes claimAlertDelivery() / dispatchAlertDelivery().
   * Toute l'orchestration reste dans PopulationService.
   */
  @Post('buildings/:buildingId/population/alerts/:alertId/send')
  async sendPopulationAlert(
    @Param('buildingId') buildingId: string,
    @Param('alertId') alertId: string,
    @Request() req: any,
  ) {
    return this.clientPortalService.sendPopulationAlert(
      buildingId,
      alertId,
      req.clientUser,
    );
  }

  /**
   * Crée une nouvelle communication UPDATE pour un incident.
   *
   * Le type UPDATE est imposé côté serveur par le service :
   * le client ne peut pas choisir arbitrairement le type.
   */
  @Post(
    'buildings/:buildingId/population/incidents/:incidentEventId/updates/draft',
  )
  async createPopulationIncidentUpdateDraft(
    @Param('buildingId') buildingId: string,
    @Param('incidentEventId') incidentEventId: string,
    @Body() dto: CreatePopulationFollowUpDto,
    @Request() req: any,
  ) {
    return this.clientPortalService.createPopulationIncidentUpdateDraft(
      buildingId,
      incidentEventId,
      dto,
      req.clientUser,
    );
  }

  /**
   * Crée la communication ALL_CLEAR d'un incident.
   *
   * Il s'agit d'une nouvelle communication historique :
   * l'alerte précédente n'est jamais réécrite.
   */
  @Post(
    'buildings/:buildingId/population/incidents/:incidentEventId/all-clear/draft',
  )
  async createPopulationIncidentAllClearDraft(
    @Param('buildingId') buildingId: string,
    @Param('incidentEventId') incidentEventId: string,
    @Body() dto: CreatePopulationFollowUpDto,
    @Request() req: any,
  ) {
    return this.clientPortalService.createPopulationIncidentAllClearDraft(
      buildingId,
      incidentEventId,
      dto,
      req.clientUser,
    );
  }

  /**
   * Retourne la chronologie des communications Population
   * rattachées à un incident.
   */
  @Get(
    'buildings/:buildingId/population/incidents/:incidentEventId/alerts',
  )
  async getPopulationIncidentAlertHistory(
    @Param('buildingId') buildingId: string,
    @Param('incidentEventId') incidentEventId: string,
    @Request() req: any,
  ) {
    return this.clientPortalService.getPopulationIncidentAlertHistory(
      buildingId,
      incidentEventId,
      req.clientUser,
    );
  }

  /**
   * Clôture administrativement une communication ACTIVE.
   *
   * Cette opération ne supprime ni les snapshots,
   * ni les destinataires figés, ni les preuves de livraison.
   */
  @Post(
    'buildings/:buildingId/population/alerts/:alertId/end',
  )
  async endPopulationAlert(
    @Param('buildingId') buildingId: string,
    @Param('alertId') alertId: string,
    @Request() req: any,
  ) {
    return this.clientPortalService.endPopulationAlert(
      buildingId,
      alertId,
      req.clientUser,
    );
  }

  /**
   * Annule une communication Population qui n'a pas encore
   * commencé sa diffusion.
   *
   * La communication reste conservée dans l'historique.
   */
  @Post(
    'buildings/:buildingId/population/alerts/:alertId/cancel',
  )
  async cancelPopulationAlert(
    @Param('buildingId') buildingId: string,
    @Param('alertId') alertId: string,
    @Request() req: any,
  ) {
    return this.clientPortalService.cancelPopulationAlert(
      buildingId,
      alertId,
      req.clientUser,
    );
  }

  // ── Module Incident ──────────────────────────────────────────────────────

  @Post('buildings/:buildingId/panic')
  async triggerPanic(
    @Param('buildingId') buildingId: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.incidentService.triggerPanic(
      buildingId,
      body,
      req.clientUser.organizationId,
    );
  }

  @Post('incidents/trigger')
  async triggerIncident(@Body() body: any, @Request() req: any) {
    return this.incidentService.triggerIncident(
      body,
      req.clientUser.organizationId,
    );
  }

  @Get('incidents/buildings/:buildingId/active')
  async getActiveIncident(
    @Param('buildingId') buildingId: string,
    @Request() req: any,
  ) {
    return this.incidentService.getActiveIncident(
      buildingId,
      req.clientUser.organizationId,
    );
  }

  @Get('incidents/buildings/:buildingId/active-all')
  async getActiveIncidents(
    @Param('buildingId') buildingId: string,
    @Request() req: any,
  ) {
    return this.incidentService.getActiveIncidents(
      buildingId,
      req.clientUser.organizationId,
    );
  }

  @Get('buildings/:buildingId/resilience-history')
  async getResilienceHistory(
    @Param('buildingId') buildingId: string,
    @Request() req: any,
    @Query('days') days?: string,
  ) {
    return this.occupancyService.getResilienceHistory(
      buildingId,
      req.clientUser.organizationId,
      days ? parseInt(days) : 90,
    );
  }

  @Post('buildings/:buildingId/resilience-snapshot')
  async forceResilienceSnapshot(
    @Param('buildingId') buildingId: string,
    @Request() req: any,
  ) {
    const kiosk = await this.occupancyService.getOrCreateKioskTokenForOrg(
      buildingId,
      req.clientUser.organizationId,
    );
    await this.occupancyService.saveResilienceSnapshot(buildingId, kiosk.token);
    return { success: true };
  }

  @Get('intelligence/overview')
  async getIntelligenceOverview(@Request() req: any) {
    return this.occupancyService.getIntelligenceOverview(
      req.clientUser.organizationId,
    );
  }

  @Get('corrective-actions')
  async getCorrectiveActions(
    @Request() req: CorrectiveActionRequest,
    @Query('buildingId') buildingId?: string,
  ) {
    return this.correctiveActionsService.getAll(req.clientUser, buildingId);
  }

  @Post('corrective-actions')
  async createCorrectiveAction(
    @Body() body: CreateCorrectiveActionDto,
    @Request() req: CorrectiveActionRequest,
  ) {
    return this.correctiveActionsService.create(body, req.clientUser);
  }

  @Put('corrective-actions/:id')
  async updateCorrectiveAction(
    @Param('id') id: string,
    @Body() body: UpdateCorrectiveActionDto,
    @Request() req: CorrectiveActionRequest,
  ) {
    return this.correctiveActionsService.update(id, body, req.clientUser);
  }

  @Put('corrective-actions/:id/delete')
  async deleteCorrectiveAction(
    @Param('id') id: string,
    @Request() req: CorrectiveActionRequest,
  ) {
    return this.correctiveActionsService.delete(id, req.clientUser);
  }

  @Put('incidents/tasks/:taskId/uncomplete')
  async uncompleteStep(@Param('taskId') taskId: string, @Request() req: any) {
    return this.incidentService.uncompleteStep(
      taskId,
      req.clientUser.organizationId,
    );
  }

  @Put('incidents/tasks/:taskId/acknowledge')
  async acknowledgeTask(@Param('taskId') taskId: string, @Request() req: any) {
    return this.incidentService.acknowledgeTask(
      taskId,
      req.clientUser.organizationId,
    );
  }

  @Put('incidents/tasks/:taskId/complete')
  async completeTask(@Param('taskId') taskId: string, @Request() req: any) {
    return this.incidentService.completeTask(
      taskId,
      req.clientUser.organizationId,
    );
  }

  @Post('incidents/:incidentId/logs')
  async addIncidentLog(
    @Param('incidentId') incidentId: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.incidentService.addLog(
      incidentId,
      body,
      req.clientUser.organizationId,
    );
  }

  @Put('incidents/:incidentId/confirm-pre-alert')
  async confirmIncidentPreAlert(
    @Param('incidentId') incidentId: string,
    @Request() req: any,
  ) {
    return this.incidentService.confirmPreAlert(
      incidentId,
      req.clientUser.organizationId,
      req.clientUser.email,
    );
  }

  @Put('incidents/:incidentId/cancel-pre-alert')
  async cancelIncidentPreAlert(
    @Param('incidentId') incidentId: string,
    @Request() req: any,
  ) {
    return this.incidentService.cancelPreAlert(
      incidentId,
      req.clientUser.organizationId,
      req.clientUser.email,
    );
  }

  @Put('incidents/:incidentId/contain')
  async containIncident(
    @Param('incidentId') incidentId: string,
    @Request() req: any,
  ) {
    return this.incidentService.containIncident(
      incidentId,
      req.clientUser.organizationId,
    );
  }

  @Put('incidents/:incidentId/resolve')
  async resolveIncident(
    @Param('incidentId') incidentId: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.incidentService.resolveIncident(
      incidentId,
      body,
      req.clientUser.organizationId,
    );
  }

  @Post('incidents/:incidentId/send-access')
  async sendInterventionAccess(
    @Param('incidentId') incidentId: string,
    @Body() body: { emails: string[] },
    @Request() req: any,
  ) {
    return this.incidentService.sendInterventionAccessByEmail(
      incidentId,
      body.emails,
      req.clientUser.organizationId,
    );
  }

  @Get('incidents/buildings/:buildingId/history')
  async getIncidentHistory(
    @Param('buildingId') buildingId: string,
    @Request() req: any,
  ) {
    return this.incidentService.getIncidentHistory(
      buildingId,
      req.clientUser.organizationId,
    );
  }

  @Post('employees/import-csv')
  async importEmployeesCsv(@Body() body: any, @Request() req: any) {
    return this.occupancyEmployeesService.importEmployeesCsv(
      body.buildingId,
      body.csvContent,
      req.clientUser.organizationId,
      body.sendEmails !== false,
    );
  }

  @Get('incidents/:incidentId/detail')
  async getIncidentDetail(
    @Param('incidentId') incidentId: string,
    @Request() req: any,
  ) {
    return this.incidentService.getIncidentDetail(
      incidentId,
      req.clientUser.organizationId,
    );
  }

  @Put('incidents/:incidentId/rex')
  async updateRex(
    @Param('incidentId') incidentId: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.incidentService.updateRex(
      incidentId,
      body,
      req.clientUser.organizationId,
    );
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
