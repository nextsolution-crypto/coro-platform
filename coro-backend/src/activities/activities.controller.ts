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
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ActivitiesService } from './activities.service';
import { ActivityTaskListsService } from './activity-task-lists.service';
import type { Response } from 'express';
import type { ProjectActivity } from '@prisma/client';
import { AdviserActor } from '../auth/project-access';
import { requireTenantAdmin } from '../auth/work-management-access';

interface AuthenticatedRequest {
  user: AdviserActor;
}

interface LegacyMandateGenerationDto {
  services: { activityTypeId: string; isRecurring: boolean }[];
}

@Controller()
@UseGuards(AuthGuard('jwt'))
export class ActivitiesController {
  private readonly logger = new Logger(ActivitiesController.name);

  constructor(
    private readonly service: ActivitiesService,
    private readonly taskLists: ActivityTaskListsService,
  ) {}

  @Post('projects/:projectId/activities/:activityId/task-lists/instantiate')
  instantiateTaskLists(
    @Param('projectId') projectId: string,
    @Param('activityId') activityId: string,
    @Request() req: AuthenticatedRequest,
  ) {
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
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.createActivity(projectId, req.user, dto);
  }

  @Put('activities/:activityId')
  updateActivity(
    @Param('activityId') activityId: string,
    @Body() dto: any,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.updateActivity(
      activityId,
      req.user.organizationId,
      dto,
    );
  }

  @Delete('activities/:activityId')
  deleteActivity(
    @Param('activityId') activityId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.deleteActivity(activityId, req.user.organizationId);
  }

  /**
   * @deprecated Legacy mandate activity generation. Use ProjectMandateService Preview/Apply.
   */
  @Post('projects/:projectId/activities/from-mandate')
  async generateFromMandate(
    @Param('projectId') projectId: string,
    @Body() dto: LegacyMandateGenerationDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<unknown> {
    requireTenantAdmin(req.user);
    const context = {
      projectId,
      role: req.user.role,
      organizationId: req.user.organizationId,
    };
    this.logger.warn({ event: 'LEGACY_MANDATE_GENERATION_CALLED', ...context });
    try {
      const result: unknown = await this.service.generateFromMandate(
        projectId,
        req.user,
        dto.services,
      );
      this.logger.warn({
        event: 'LEGACY_MANDATE_GENERATION_SUCCEEDED',
        ...context,
      });
      return result;
    } catch (error) {
      this.logger.warn({
        event: 'LEGACY_MANDATE_GENERATION_FAILED',
        ...context,
        errorType:
          error instanceof Error ? error.constructor.name : 'UnknownError',
      });
      throw error;
    }
  }

  @Post('projects/:projectId/activities/duplicate')
  duplicateActivities(
    @Param('projectId') projectId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.duplicateActivities(projectId, req.user.organizationId);
  }

  @Get('activities/:activityId/ics')
  async downloadIcs(
    @Param('activityId') activityId: string,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const activity: ProjectActivity | null = await this.service[
      'prisma'
    ].projectActivity.findFirst({
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
  getClientPortfolio(
    @Param('clientId') clientId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.getClientPortfolio(clientId, req.user.organizationId);
  }

  @Get('activities/recurring-to-renew')
  getRecurringToRenew(@Request() req: AuthenticatedRequest) {
    return this.service.getRecurringToRenew(req.user.organizationId);
  }

  @Get('activities/upcoming')
  getUpcoming(@Request() req: AuthenticatedRequest) {
    return this.service.getUpcoming(req.user.organizationId);
  }
}
