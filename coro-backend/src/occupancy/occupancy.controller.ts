import {
  Controller, Get, Post, Body, Param, UseGuards, Request, Put, Query
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OccupancyService } from './occupancy.service';
import { IncidentService } from './incident.service';
import { OperationalContinuityAccess } from '../auth/organization-access.decorator';
import {
  CheckInDto, CheckOutDto, TriggerEvacuationDto, AccountForOccupantDto
} from './occupancy.dto';

@Controller('occupancy')
@OperationalContinuityAccess()
export class OccupancyController {
  constructor(
    private readonly occupancyService: OccupancyService,
    private readonly incidentService: IncidentService,
  ) {}

  // Fiche d'intervention — accès public temporaire par QR (aucune authentification,
  // valide tant que l'incident lié est actif)
  @Get('intervention-access/:token')
  getInterventionAccess(@Param('token') token: string) {
    return this.incidentService.getInterventionSheetByToken(token);
  }

  // Incident actif d'un bâtiment — pour affichage du QR sur la borne kiosque (public)
  @Get('kiosk/:kioskToken/active-incident')
  async getActiveIncidentForKiosk(@Param('kioskToken') kioskToken: string) {
    try {
      const resolved = await this.occupancyService.resolveBuildingFromToken(kioskToken);
      const incident = await this.incidentService.getActiveIncidentPublic(resolved.buildingId);
      if (!incident) return { active: false };
      return { active: true, publicAccessToken: incident.publicAccessToken, type: incident.type, status: incident.status };
    } catch {
      return { active: false };
    }
  }

  // ── Routes PUBLIQUES (borne kiosque — token dans le body) ─────────────────

  @Post('checkin')
  checkIn(@Body() body: any) {
    return this.occupancyService.checkIn(body);
  }

  @Post('checkout')
  checkOut(@Body() body: any) {
    return this.occupancyService.checkOut(body);
  }

    // Résoudre buildingId depuis token (public — borne kiosque)
  @Get('kiosk/resolve/:token')
  resolveToken(@Param('token') token: string) {
    return this.occupancyService.resolveBuildingFromToken(token);
  }

  // Recherche occupants pour checkout (public — token dans query)
  @Get('buildings/:buildingId/search')
  searchForCheckout(
    @Param('buildingId') buildingId: string,
    @Query('q') q: string,
    @Query('token') token: string,
  ) {
    return this.occupancyService.searchOccupantsForCheckout(buildingId, token, q);
  }

  // Les lectures publiques par jeton de borne (présents, historique,
  // préparation) ont été retirées : elles exposaient des données personnelles
  // à quiconque possédait le jeton permanent. Le portail client passe par
  // les façades authentifiées /client-portal/buildings/:id/sentinelle/*.

  // ── Routes PROTÉGÉES (dashboard admin CORO) ───────────────────────────────

  @UseGuards(AuthGuard('jwt'))
  @Get('buildings/:buildingId/current')
  getCurrentOccupants(@Param('buildingId') buildingId: string, @Request() req) {
    return this.occupancyService.getCurrentOccupants(
      buildingId, req.user.organizationId
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('buildings/:buildingId/history')
  getTodayHistory(@Param('buildingId') buildingId: string, @Request() req) {
    return this.occupancyService.getTodayHistory(
      buildingId, req.user.organizationId
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('buildings/:buildingId/kiosk-token')
  getKioskToken(@Param('buildingId') buildingId: string, @Request() req) {
    return this.occupancyService.getOrCreateKioskToken(
      buildingId, req.user.organizationId
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('buildings/:buildingId/kiosk-token/regenerate')
  regenerateKioskToken(@Param('buildingId') buildingId: string, @Request() req) {
    return this.occupancyService.regenerateKioskToken(
      buildingId, req.user.organizationId
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('buildings/:buildingId/alarm-token')
  getAlarmToken(@Param('buildingId') buildingId: string, @Request() req) {
    return this.occupancyService.getOrCreateAlarmToken(
      buildingId, req.user.organizationId
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('buildings/:buildingId/alarm-token/regenerate')
  regenerateAlarmToken(@Param('buildingId') buildingId: string, @Request() req) {
    return this.occupancyService.regenerateAlarmToken(
      buildingId, req.user.organizationId
    );
  }

  // Pont panneau d'alarme incendie (PAI) — appelé par le dispositif IoT du
  // bâtiment, authentifié par le jeton dans l'URL (aucun compte utilisateur).
  @Post('alarm-trigger/:token')
  triggerFromAlarmPanel(@Param('token') token: string) {
    return this.incidentService.triggerFromAlarmPanel(token);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('evacuation/trigger')
  triggerEvacuation(@Body() dto: TriggerEvacuationDto, @Request() req) {
    return this.occupancyService.triggerEvacuation(dto, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('buildings/:buildingId/evacuation/active')
  getActiveEvacuation(@Param('buildingId') buildingId: string, @Request() req) {
    return this.occupancyService.getActiveEvacuation(
      buildingId, req.user.organizationId
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('evacuation/account')
  async accountForOccupant(@Body() dto: AccountForOccupantDto, @Request() req) {
    const actor = await this.occupancyService.resolveAdvisorActor(req.user.userId ?? req.user.sub, req.user.organizationId);
    if (dto.status) {
      return this.occupancyService.setAccountabilityStatus(
        { ...dto, status: dto.status },
        req.user.organizationId,
        actor,
      );
    }
    return this.occupancyService.accountForOccupant(dto, req.user.organizationId, actor);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('evacuation/:id/resolve')
  async resolveEvacuation(@Param('id') id: string, @Body() body: { closureReason?: string }, @Request() req) {
    const actor = await this.occupancyService.resolveAdvisorActor(req.user.userId ?? req.user.sub, req.user.organizationId);
    return this.occupancyService.resolveEvacuation(id, req.user.organizationId, {
      closureReason: body?.closureReason,
      actorName: actor.name,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('buildings/:buildingId/evacuation/history')
  getEvacuationHistory(@Param('buildingId') buildingId: string, @Request() req) {
    return this.occupancyService.getEvacuationHistory(
      buildingId, req.user.organizationId
    );
  }

    @UseGuards(AuthGuard('jwt'))
  @Get('buildings/:buildingId/history')
  getHistory(
    @Param('buildingId') buildingId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req: any,
  ) {
    return this.occupancyService.getHistory(buildingId, req.user.organizationId, from, to);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('evacuation/:id/detail')
  getEvacuationDetail(@Param('id') id: string, @Request() req: any) {
    return this.occupancyService.getEvacuationDetail(id, req.user.organizationId);
  }
}
