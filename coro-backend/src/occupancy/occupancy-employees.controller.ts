import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { OccupancyEmployeesService } from './occupancy-employees.service';
import { PresenceFlowService } from './presence-flow.service';
import { OperationalContinuityAccess } from '../auth/organization-access.decorator';

@Controller('occupancy')
@OperationalContinuityAccess()
export class OccupancyEmployeesController {
  constructor(
    private readonly service: OccupancyEmployeesService,
    private readonly presenceFlow: PresenceFlowService,
  ) {}

  @Get('presence/challenge/:displayToken')
  issuePresenceChallenge(@Param('displayToken') displayToken: string) {
    return this.presenceFlow.issueChallenge(displayToken);
  }

  @Post('presence/session/start')
  startPresenceSession(@Body() body: any, @Request() req: any) {
    return this.presenceFlow.start(
      body.sessionId,
      body.challenge,
      this.readCookie(req, 'coro_presence_device'),
    );
  }

  @Post('presence/session/identify')
  identifyPresenceSession(@Body() body: any) {
    return this.presenceFlow.identify(body.sessionId, body.pin);
  }

  @Post('presence/session/confirm')
  async confirmPresenceSession(
    @Body() body: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.presenceFlow.confirm(
      body.sessionId,
      body.action,
      body.idempotencyKey,
      body.rememberDevice === true,
    );
    if (result.deviceToken) {
      response.cookie('coro_presence_device', result.deviceToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/api/occupancy/presence',
      });
    }
    const { deviceToken: _secret, ...safeResult } = result;
    return safeResult;
  }

  @Post('presence/device/forget')
  async forgetPresenceDevice(
    @Request() req: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.presenceFlow.forgetDevice(
      this.readCookie(req, 'coro_presence_device'),
    );
    response.clearCookie('coro_presence_device', {
      path: '/api/occupancy/presence',
    });
    return { forgotten: true };
  }

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

  @Post('presence/pin')
  checkinByPin() {
    throw new BadRequestException(
      'Ce parcours a été remplacé. Scannez le QR temporaire affiché à la borne.',
    );
  }

  // ── Routes protégées (portail client) ─────────────────────────────────────

  @UseGuards(AuthGuard('jwt'))
  @Get('buildings/:buildingId/presence-displays')
  listPresenceDisplays(
    @Param('buildingId') buildingId: string,
    @Request() req: any,
  ) {
    return this.presenceFlow.listDisplays(buildingId, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('buildings/:buildingId/presence-displays')
  createPresenceDisplay(
    @Param('buildingId') buildingId: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.presenceFlow.createDisplay(
      buildingId,
      req.user.organizationId,
      body.label,
    );
  }

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
  @Put('employees/:id')
  updateEmployee(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.service.updateEmployee(id, body, req.user.organizationId);
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
    return this.service.createInvitation(
      body,
      req.user.organizationId,
      req.user.sub,
    );
  }

  @Get('qr/info/:token')
  resolveQrInfo(@Param('token') token: string) {
    return this.service.resolveQrInfo(token);
  }

  private readCookie(req: any, name: string): string | undefined {
    const raw = String(req.headers?.cookie || '');
    const prefix = `${name}=`;
    const value = raw
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix));
    return value ? decodeURIComponent(value.slice(prefix.length)) : undefined;
  }
}
