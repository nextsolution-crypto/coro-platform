import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IncidentService } from './incident.service';

@Controller('incidents')
export class IncidentController {
  constructor(private readonly service: IncidentService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('trigger')
  trigger(@Body() body: any, @Request() req: any) {
    return this.service.triggerIncident(body, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('buildings/:buildingId/active')
  getActive(@Param('buildingId') buildingId: string, @Request() req: any) {
    return this.service.getActiveIncident(buildingId, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('buildings/:buildingId/active-all')
  getActiveAll(@Param('buildingId') buildingId: string, @Request() req: any) {
    return this.service.getActiveIncidents(buildingId, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('tasks/:taskId/uncomplete')
  uncomplete(@Param('taskId') taskId: string, @Request() req: any) {
    return this.service.uncompleteStep(taskId, req.user.organizationId);
  }

  // Route publique — pas de guard JWT (lien cliqué depuis un SMS/courriel)
  @Get('tasks/ack/:ackToken')
  acknowledgeByToken(@Param('ackToken') ackToken: string) {
    return this.service.acknowledgeByToken(ackToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('tasks/:taskId/acknowledge')
  acknowledge(@Param('taskId') taskId: string, @Request() req: any) {
    return this.service.acknowledgeTask(taskId, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('tasks/:taskId/complete')
  complete(@Param('taskId') taskId: string, @Request() req: any) {
    return this.service.completeTask(taskId, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':incidentId/logs')
  addLog(@Param('incidentId') incidentId: string, @Body() body: any, @Request() req: any) {
    return this.service.addLog(incidentId, body, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':incidentId/contain')
  contain(@Param('incidentId') incidentId: string, @Request() req: any) {
    return this.service.containIncident(incidentId, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':incidentId/resolve')
  resolve(@Param('incidentId') incidentId: string, @Body() body: any, @Request() req: any) {
    return this.service.resolveIncident(incidentId, body, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':incidentId/confirm-pre-alert')
  confirmPreAlert(@Param('incidentId') incidentId: string, @Request() req: any) {
    return this.service.confirmPreAlert(incidentId, req.user.organizationId, req.user.email);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':incidentId/cancel-pre-alert')
  cancelPreAlert(@Param('incidentId') incidentId: string, @Request() req: any) {
    return this.service.cancelPreAlert(incidentId, req.user.organizationId, req.user.email);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':incidentId/send-access')
  sendAccess(@Param('incidentId') incidentId: string, @Body() body: { emails: string[] }, @Request() req: any) {
    return this.service.sendInterventionAccessByEmail(incidentId, body.emails, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('buildings/:buildingId/history')
  history(@Param('buildingId') buildingId: string, @Request() req: any) {
    return this.service.getIncidentHistory(buildingId, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':incidentId/detail')
  detail(@Param('incidentId') incidentId: string, @Request() req: any) {
    return this.service.getIncidentDetail(incidentId, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':incidentId/rex')
  updateRex(@Param('incidentId') incidentId: string, @Body() body: any, @Request() req: any) {
    return this.service.updateRex(incidentId, body, req.user.organizationId);
  }
}