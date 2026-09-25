import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ActivitiesService } from './activities.service';
import { ActivityTaskListsService } from './activity-task-lists.service';
import type { Response } from 'express';
import { AdviserActor } from '../auth/project-access';

interface AuthenticatedRequest {
  user: AdviserActor;
}

@Controller()
@UseGuards(AuthGuard('jwt'))
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService, private readonly taskLists: ActivityTaskListsService) {}

  @Post('projects/:projectId/activities/:activityId/task-lists/instantiate')
  instantiateTaskLists(@Param('projectId') projectId: string, @Param('activityId') activityId: string,
    @Request() req: AuthenticatedRequest) {
    return this.taskLists.instantiateForActor(projectId, activityId, req.user);
  }

  @Get('activities/catalog')
  getCatalog(@Request() req: AuthenticatedRequest) {
    return this.service.getCatalog(req.user);
  }

  @Get('projects/:projectId/activities')
  getActivities(
    @Param('projectId') projectId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.getActivities(projectId, req.user);
  }

  @Get('projects/:projectId/activities/:activityId/tasks')
  getActivityTasks(
    @Param('projectId') projectId: string,
    @Param('activityId') activityId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.getActivityTasks(projectId, activityId, req.user);
  }

  @Get('projects/:projectId/activities/:activityId/task-candidates')
  getTaskCandidates(
    @Param('projectId') projectId: string,
    @Param('activityId') activityId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.getTaskCandidates(projectId, activityId, req.user);
  }

  @Post('projects/:projectId/activities')
  createActivity(
    @Param('projectId') projectId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.service.createActivity(projectId, req.user, dto);
  }

  @Put('activities/:activityId')
  updateActivity(
    @Param('activityId') activityId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.service.updateActivity(
      activityId,
      req.user.organizationId,
      dto,
    );
  }

  @Delete('activities/:activityId')
  deleteActivity(@Param('activityId') activityId: string, @Request() req: any) {
    return this.service.deleteActivity(activityId, req.user.organizationId);
  }

  @Post('projects/:projectId/activities/from-mandate')
  generateFromMandate(
    @Param('projectId') projectId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.service.generateFromMandate(
      projectId,
      req.user.organizationId,
      dto.services,
    );
  }

  @Post('projects/:projectId/activities/duplicate')
  duplicateActivities(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ) {
    return this.service.duplicateActivities(projectId, req.user.organizationId);
  }

  @Get('activities/:activityId/ics')
  async downloadIcs(
    @Param('activityId') activityId: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const activity = await this.service['prisma'].projectActivity.findFirst({
      where: { id: activityId, organizationId: req.user.organizationId },
    });
    if (!activity)
      return res.status(404).json({ message: 'Activité introuvable' });
    const ics = this.service.generateIcs(activity);
    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="activite-${activityId}.ics"`,
    });
    return res.send(ics);
  }

  @Get('clients/:clientId/activities/portfolio')
  getClientPortfolio(@Param('clientId') clientId: string, @Request() req: any) {
    return this.service.getClientPortfolio(clientId, req.user.organizationId);
  }

  @Get('activities/recurring-to-renew')
  getRecurringToRenew(@Request() req: any) {
    return this.service.getRecurringToRenew(req.user.organizationId);
  }

  @Get('activities/upcoming')
  getUpcoming(@Request() req: any) {
    return this.service.getUpcoming(req.user.organizationId);
  }
}
