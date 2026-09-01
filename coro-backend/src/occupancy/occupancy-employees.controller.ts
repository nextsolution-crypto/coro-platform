import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OccupancyEmployeesService } from './occupancy-employees.service';

@Controller('occupancy')
export class OccupancyEmployeesController {
  constructor(private readonly service: OccupancyEmployeesService) {}

  // ── Routes publiques (borne kiosque) ─────────────────────────────────────

  @Post('qr/employee')
  checkinByEmployeeQr(@Body() body: any) {
    return this.service.checkinByQrToken(body.qrToken, body.kioskToken);
  }

  @Post('qr/invitation')
  checkinByInvitationQr(@Body() body: any) {
    return this.service.checkinByInvitationToken(body.qrToken, body.kioskToken);
  }

    @Post('qr/checkout')
  checkoutByQr(@Body() body: any) {
    return this.service.checkoutByQrToken(body.qrToken, body.kioskToken);
  }

  // ── Routes protégées (portail client) ─────────────────────────────────────

  @UseGuards(AuthGuard('jwt'))
  @Get('buildings/:buildingId/employees')
  getEmployees(@Param('buildingId') buildingId: string, @Request() req: any) {
    return this.service.getEmployees(buildingId, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('employees')
  createEmployee(@Body() body: any, @Request() req: any) {
    return this.service.createEmployee(body, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('employees/:id')
  deleteEmployee(@Param('id') id: string, @Request() req: any) {
    return this.service.deleteEmployee(id, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('buildings/:buildingId/invitations')
  getInvitations(@Param('buildingId') buildingId: string, @Request() req: any) {
    return this.service.getInvitations(buildingId, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('invitations')
  createInvitation(@Body() body: any, @Request() req: any) {
    return this.service.createInvitation(body, req.user.organizationId, req.user.sub);
  }

    @Get('qr/info/:token')
  resolveQrInfo(@Param('token') token: string) {
    return this.service.resolveQrInfo(token);
  }
}