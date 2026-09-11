import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IncidentService } from './incident.service';

@Controller('incidents')
@UseGuards(AuthGuard('jwt'))
export class IncidentController {
  constructor(private readonly service: IncidentService) {}

  @Post('trigger')
  trigger(@Body() body: any, @Request() req: any) {
    return this.service.triggerIncident(body, req.user.organizationId);
  }

  @Get('buildings/:buildingId/active')
  getActive(@Param('buildingId') buildingId: string, @Request() req: any) {
    return this.service.getActiveIncident(buildingId, req.user.organizationId);
  }

  @Get('buildings/:buildingId/active-all')
  getActiveAll(@Param('buildingId') buildingId: string, @Request() req: any) {
    return this.service.getActiveIncidents(buildingId, req.user.organizationId);
  }

  @Put('tasks/:taskId/uncomplete')
  uncomplete(@Param('taskId') taskId: string, @Request() req: any) {
    return this.service.uncompleteStep(taskId, req.user.organizationId);
  }

  @Put('tasks/:taskId/acknowledge')
  acknowledge(@Param('taskId') taskId: string, @Request() req: any) {
    return this.service.acknowledgeTask(taskId, req.user.organizationId);
  }

  @Put('tasks/:taskId/complete')
  complete(@Param('taskId') taskId: string, @Request() req: any) {
    return this.service.completeTask(taskId, req.user.organizationId);
  }

  @Post(':incidentId/logs')
  addLog(@Param('incidentId') incidentId: string, @Body() body: any, @Request() req: any) {
    return this.service.addLog(incidentId, body, req.user.organizationId);
  }

  @Put(':incidentId/contain')
  contain(@Param('incidentId') incidentId: string, @Request() req: any) {
    return this.service.containIncident(incidentId, req.user.organizationId);
  }

  @Put(':incidentId/resolve')
  resolve(@Param('incidentId') incidentId: string, @Body() body: any, @Request() req: any) {
    return this.service.resolveIncident(incidentId, body, req.user.organizationId);
  }

  @Get('buildings/:buildingId/history')
  history(@Param('buildingId') buildingId: string, @Request() req: any) {
    return this.service.getIncidentHistory(buildingId, req.user.organizationId);
  }
}