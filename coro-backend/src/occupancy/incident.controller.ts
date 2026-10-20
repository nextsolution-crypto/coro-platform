import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IncidentService } from './incident.service';
import { OperationalContinuityAccess } from '../auth/organization-access.decorator';
import { IncidentPermission, PlatformPermission } from '@prisma/client';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { RequirePlatformPermission } from '../auth/platform-permission.decorator';

@Controller('incidents')
@OperationalContinuityAccess()
export class IncidentController {
  constructor(private readonly service: IncidentService) {}

  @UseGuards(AuthGuard('jwt'))
  @UseGuards(PlatformRolesGuard)
  @RequirePlatformPermission(PlatformPermission.INCIDENT_COMMAND)
  @Post('trigger')
  async trigger(@Body() body: any, @Request() req: any) {
    const actorId = req.user.userId || req.user.sub;
    const assignment = await this.service.requireIncidentAuthority({ actorType: 'USER', actorId, organizationId: req.user.organizationId, buildingId: body.buildingId, permission: IncidentPermission.INCIDENT_COMMAND });
    return this.service.triggerIncident(body, req.user.organizationId, undefined, { actorType: 'USER', actorId, assignmentId: assignment.id, permission: IncidentPermission.INCIDENT_COMMAND, reason: body.reason || 'Incident creation', requestId: req.id || req.headers?.['x-request-id'] });
  }

  @UseGuards(AuthGuard('jwt'))
  @UseGuards(PlatformRolesGuard)
  @RequirePlatformPermission(PlatformPermission.INCIDENT_READ)
  @Get('buildings/:buildingId/active')
  getActive(@Param('buildingId') buildingId: string, @Request() req: any) {
    return this.service.getActiveIncident(buildingId, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @UseGuards(PlatformRolesGuard)
  @RequirePlatformPermission(PlatformPermission.INCIDENT_READ)
  @Get('buildings/:buildingId/active-all')
  getActiveAll(@Param('buildingId') buildingId: string, @Request() req: any) {
    return this.service.getActiveIncidents(buildingId, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @UseGuards(PlatformRolesGuard)
  @RequirePlatformPermission(PlatformPermission.INCIDENT_SUPERVISE)
  @Put('tasks/:taskId/uncomplete')
  async uncomplete(@Param('taskId') taskId: string, @Request() req: any) {
    const actorId = req.user.userId || req.user.sub;
    const assignment = await this.service.requireTaskAuthority(taskId, 'USER', actorId, req.user.organizationId, IncidentPermission.INCIDENT_SUPERVISE);
    return this.service.uncompleteStep(taskId, req.user.organizationId, { actorType: 'USER', actorId, assignmentId: assignment.id, permission: IncidentPermission.INCIDENT_SUPERVISE, reason: 'Task reopened', requestId: req.id || req.headers?.['x-request-id'] });
  }

  // Route publique — pas de guard JWT (lien cliqué depuis un SMS/courriel)
  @Get('tasks/ack/:ackToken')
  acknowledgeByToken(@Param('ackToken') ackToken: string) {
    return this.service.acknowledgeByToken(ackToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @UseGuards(PlatformRolesGuard)
  @RequirePlatformPermission(PlatformPermission.INCIDENT_TASK_PARTICIPATE)
  @Put('tasks/:taskId/acknowledge')
  async acknowledge(@Param('taskId') taskId: string, @Request() req: any) {
    const actorId = req.user.userId || req.user.sub;
    const assignment = await this.service.requireTaskAuthority(taskId, 'USER', actorId, req.user.organizationId, IncidentPermission.INCIDENT_TASK_PARTICIPATE);
    return this.service.acknowledgeTask(taskId, req.user.organizationId, { actorType: 'USER', actorId, assignmentId: assignment.id, permission: IncidentPermission.INCIDENT_TASK_PARTICIPATE, reason: 'Task acknowledgment', requestId: req.id || req.headers?.['x-request-id'] });
  }

  @UseGuards(AuthGuard('jwt'))
  @UseGuards(PlatformRolesGuard)
  @RequirePlatformPermission(PlatformPermission.INCIDENT_TASK_PARTICIPATE)
  @Put('tasks/:taskId/complete')
  async complete(@Param('taskId') taskId: string, @Request() req: any) {
    const actorId = req.user.userId || req.user.sub;
    const assignment = await this.service.requireTaskAuthority(taskId, 'USER', actorId, req.user.organizationId, IncidentPermission.INCIDENT_TASK_PARTICIPATE);
    return this.service.completeTask(taskId, req.user.organizationId, { actorType: 'USER', actorId, assignmentId: assignment.id, permission: IncidentPermission.INCIDENT_TASK_PARTICIPATE, reason: 'Task execution', requestId: req.id || req.headers?.['x-request-id'] });
  }

  @UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
  @RequirePlatformPermission(PlatformPermission.INCIDENT_SUPERVISE)
  @Put('tasks/:taskId/reassign')
  async reassign(@Param('taskId') taskId: string, @Body() body: { employeeId: string; lockVersion: number }, @Request() req: any) {
    const actorId = req.user.userId || req.user.sub;
    const assignment = await this.service.requireTaskAuthority(taskId, 'USER', actorId, req.user.organizationId, IncidentPermission.INCIDENT_SUPERVISE);
    return this.service.reassignTask(taskId, body.employeeId, body.lockVersion, req.user.organizationId, actorId, { actorType: 'USER', actorId, assignmentId: assignment.id, permission: IncidentPermission.INCIDENT_SUPERVISE, reason: 'Task reassignment', requestId: req.id || req.headers?.['x-request-id'] });
  }

  @UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
  @RequirePlatformPermission(PlatformPermission.INCIDENT_SUPERVISE)
  @Put('tasks/:taskId/escalation-policy')
  async configureEscalation(@Param('taskId') taskId: string, @Body() body: { severity: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW'; alternateEmployeeIds?: string[]; acknowledgmentSubjectType: 'USER' | 'CLIENT_USER'; acknowledgmentSubjectId: string; lockVersion: number; reason: string }, @Request() req: any) {
    const actorId = req.user.userId || req.user.sub;
    const assignment = await this.service.requireTaskAuthority(taskId, 'USER', actorId, req.user.organizationId, IncidentPermission.INCIDENT_SUPERVISE);
    return this.service.configureTaskEscalation(taskId, body, req.user.organizationId, { actorType: 'USER', actorId, assignmentId: assignment.id, permission: IncidentPermission.INCIDENT_SUPERVISE, reason: body.reason, requestId: req.id || req.headers?.['x-request-id'] });
  }

  @UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
  @RequirePlatformPermission(PlatformPermission.INCIDENT_SUPERVISE)
  @Get('buildings/:buildingId/escalations/operator-queue')
  async operatorQueue(@Param('buildingId') buildingId: string, @Request() req: any) {
    const actorId = req.user.userId || req.user.sub;
    await this.service.requireIncidentAuthority({ actorType: 'USER', actorId, organizationId: req.user.organizationId, buildingId, permission: IncidentPermission.INCIDENT_SUPERVISE });
    const queue = await this.service.getOperatorEscalationQueue(req.user.organizationId);
    return queue.filter((task: any) => task.incidentEvent.buildingId === buildingId);
  }

  @UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
  @RequirePlatformPermission(PlatformPermission.PCA_ACTIVATE)
  @Post('pca/activate')
  async activatePca(@Body() body: { buildingId: string; projectId: string; incidentEventId?: string; reason: string }, @Request() req: any) {
    const actorId = req.user.userId || req.user.sub;
    const assignment = await this.service.requireIncidentAuthority({ actorType: 'USER', actorId, organizationId: req.user.organizationId, buildingId: body.buildingId, incidentEventId: body.incidentEventId, permission: IncidentPermission.PCA_ACTIVATE });
    return this.service.activatePca(body, req.user.organizationId, actorId, 'USER', { actorType: 'USER', actorId, assignmentId: assignment.id, permission: IncidentPermission.PCA_ACTIVATE, reason: body.reason, requestId: req.id || req.headers?.['x-request-id'] });
  }

  @UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
  @RequirePlatformPermission(PlatformPermission.INCIDENT_SUPERVISE)
  @Post('authority/assign')
  async assignAuthority(@Body() body: { buildingId: string; incidentEventId?: string; subjectType: 'USER' | 'CLIENT_USER'; subjectId: string; operationalRole: string; permissions: any[]; reason: string }, @Request() req: any) {
    const actorId = req.user.userId || req.user.sub;
    const assignment = await this.service.requireIncidentAuthority({ actorType: 'USER', actorId, organizationId: req.user.organizationId, buildingId: body.buildingId, permission: IncidentPermission.INCIDENT_SUPERVISE });
    return this.service.grantIncidentAuthority({ ...body, organizationId: req.user.organizationId, grantedByType: 'USER', grantedById: actorId, authorizationAssignmentId: assignment.id, requestId: req.id || req.headers?.['x-request-id'] });
  }

  @UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
  @RequirePlatformPermission(PlatformPermission.INCIDENT_SUPERVISE)
  @Put('authority/:assignmentId/revoke')
  async revokeAuthority(@Param('assignmentId') assignmentId: string, @Body() body: { reason: string; lockVersion: number; buildingId: string; incidentEventId?: string }, @Request() req: any) {
    const actorId = req.user.userId || req.user.sub;
    const assignment = await this.service.requireIncidentAuthority({ actorType: 'USER', actorId, organizationId: req.user.organizationId, buildingId: body.buildingId, incidentEventId: body.incidentEventId, permission: IncidentPermission.INCIDENT_SUPERVISE });
    return this.service.revokeIncidentAuthority(assignmentId, req.user.organizationId, 'USER', actorId, body.reason, body.lockVersion, assignment.id, req.id || req.headers?.['x-request-id']);
  }

  @UseGuards(AuthGuard('jwt'))
  @UseGuards(PlatformRolesGuard)
  @RequirePlatformPermission(PlatformPermission.INCIDENT_SUPERVISE)
  @Post(':incidentId/logs')
  addLog(@Param('incidentId') incidentId: string, @Body() body: any, @Request() req: any) {
    return this.service.addLog(incidentId, body, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @UseGuards(PlatformRolesGuard)
  @RequirePlatformPermission(PlatformPermission.INCIDENT_COMMAND)
  @Put(':incidentId/contain')
  async contain(@Param('incidentId') incidentId: string, @Request() req: any) {
    const actorId = req.user.userId || req.user.sub;
    const assignment = await this.service.requireIncidentAuthority({ actorType: 'USER', actorId, organizationId: req.user.organizationId, incidentEventId: incidentId, permission: IncidentPermission.INCIDENT_COMMAND });
    return this.service.containIncident(incidentId, req.user.organizationId, { actorType: 'USER', actorId, assignmentId: assignment.id, permission: IncidentPermission.INCIDENT_COMMAND, reason: 'Incident command transition to contained', requestId: req.id || req.headers?.['x-request-id'] });
  }

  @UseGuards(AuthGuard('jwt'))
  @UseGuards(PlatformRolesGuard)
  @RequirePlatformPermission(PlatformPermission.INCIDENT_COMMAND)
  @Put(':incidentId/resolve')
  async resolve(@Param('incidentId') incidentId: string, @Body() body: any, @Request() req: any) {
    const actorId = req.user.userId || req.user.sub;
    const assignment = await this.service.requireIncidentAuthority({ actorType: 'USER', actorId, organizationId: req.user.organizationId, incidentEventId: incidentId, permission: IncidentPermission.INCIDENT_COMMAND });
    return this.service.resolveIncident(incidentId, body, req.user.organizationId, { actorType: 'USER', actorId, assignmentId: assignment.id, permission: IncidentPermission.INCIDENT_COMMAND, reason: body.closingNotes || 'Incident resolution', requestId: req.id || req.headers?.['x-request-id'] });
  }

  @UseGuards(AuthGuard('jwt'))
  @UseGuards(PlatformRolesGuard)
  @RequirePlatformPermission(PlatformPermission.INCIDENT_COMMAND)
  @Put(':incidentId/confirm-pre-alert')
  async confirmPreAlert(@Param('incidentId') incidentId: string, @Request() req: any) {
    const actorId = req.user.userId || req.user.sub;
    const assignment = await this.service.requireIncidentAuthority({ actorType: 'USER', actorId, organizationId: req.user.organizationId, incidentEventId: incidentId, permission: IncidentPermission.INCIDENT_COMMAND });
    return this.service.confirmPreAlert(incidentId, req.user.organizationId, req.user.email, { actorType: 'USER', actorId, assignmentId: assignment.id, permission: IncidentPermission.INCIDENT_COMMAND, reason: 'Pre-alert confirmed', requestId: req.id || req.headers?.['x-request-id'] });
  }

  @UseGuards(AuthGuard('jwt'))
  @UseGuards(PlatformRolesGuard)
  @RequirePlatformPermission(PlatformPermission.INCIDENT_COMMAND)
  @Put(':incidentId/cancel-pre-alert')
  async cancelPreAlert(@Param('incidentId') incidentId: string, @Request() req: any) {
    const actorId = req.user.userId || req.user.sub;
    const assignment = await this.service.requireIncidentAuthority({ actorType: 'USER', actorId, organizationId: req.user.organizationId, incidentEventId: incidentId, permission: IncidentPermission.INCIDENT_COMMAND });
    return this.service.cancelPreAlert(incidentId, req.user.organizationId, req.user.email, { actorType: 'USER', actorId, assignmentId: assignment.id, permission: IncidentPermission.INCIDENT_COMMAND, reason: 'Pre-alert cancelled', requestId: req.id || req.headers?.['x-request-id'] });
  }

  @UseGuards(AuthGuard('jwt'))
  @UseGuards(PlatformRolesGuard)
  @RequirePlatformPermission(PlatformPermission.INCIDENT_SUPERVISE)
  @Post(':incidentId/send-access')
  async sendAccess(@Param('incidentId') incidentId: string, @Body() body: { emails: string[] }, @Request() req: any) {
    await this.service.requireIncidentAuthority({ actorType: 'USER', actorId: req.user.userId || req.user.sub, organizationId: req.user.organizationId, incidentEventId: incidentId, permission: PlatformPermission.INCIDENT_SUPERVISE as any });
    return this.service.sendInterventionAccessByEmail(incidentId, body.emails, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @UseGuards(PlatformRolesGuard)
  @RequirePlatformPermission(PlatformPermission.INCIDENT_READ)
  @Get('buildings/:buildingId/history')
  history(@Param('buildingId') buildingId: string, @Request() req: any) {
    return this.service.getIncidentHistory(buildingId, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @UseGuards(PlatformRolesGuard)
  @RequirePlatformPermission(PlatformPermission.INCIDENT_READ)
  @Get(':incidentId/detail')
  detail(@Param('incidentId') incidentId: string, @Request() req: any) {
    return this.service.getIncidentDetail(incidentId, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @UseGuards(PlatformRolesGuard)
  @RequirePlatformPermission(PlatformPermission.INCIDENT_SUPERVISE)
  @Put(':incidentId/rex')
  async updateRex(@Param('incidentId') incidentId: string, @Body() body: any, @Request() req: any) {
    await this.service.requireIncidentAuthority({ actorType: 'USER', actorId: req.user.userId || req.user.sub, organizationId: req.user.organizationId, incidentEventId: incidentId, permission: PlatformPermission.INCIDENT_SUPERVISE as any });
    return this.service.updateRex(incidentId, body, req.user.organizationId);
  }
}
