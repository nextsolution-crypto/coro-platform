import {
  Controller, Get, Post, Body, Param, UseGuards, Request, Put, Query
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OccupancyService } from './occupancy.service';
import {
  CheckInDto, CheckOutDto, TriggerEvacuationDto, AccountForOccupantDto
} from './occupancy.dto';

@Controller('occupancy')
export class OccupancyController {
  constructor(private readonly occupancyService: OccupancyService) {}

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

    // Occupants présents — authentification par token kiosque (portail client)
  @Get('buildings/:buildingId/current-public')
  getCurrentOccupantsPublic(
    @Param('buildingId') buildingId: string,
    @Query('token') token: string,
  ) {
    return this.occupancyService.getCurrentOccupantsPublic(buildingId, token);
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
  accountForOccupant(@Body() dto: AccountForOccupantDto, @Request() req) {
    return this.occupancyService.accountForOccupant(dto, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('evacuation/:id/resolve')
  resolveEvacuation(@Param('id') id: string, @Request() req) {
    return this.occupancyService.resolveEvacuation(id, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('buildings/:buildingId/evacuation/history')
  getEvacuationHistory(@Param('buildingId') buildingId: string, @Request() req) {
    return this.occupancyService.getEvacuationHistory(
      buildingId, req.user.organizationId
    );
  }
}