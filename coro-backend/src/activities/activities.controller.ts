import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ActivitiesService } from './activities.service';
import type { Response } from 'express';

@Controller()
@UseGuards(AuthGuard('jwt'))
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}

  @Get('activities/catalog')
  getCatalog() {
    return this.service.getCatalog();
  }

  @Get('projects/:projectId/activities')
  getActivities(@Param('projectId') projectId: string, @Request() req: any) {
    return this.service.getActivities(projectId, req.user.organizationId);
  }

  @Post('projects/:projectId/activities')
  createActivity(@Param('projectId') projectId: string, @Body() dto: any, @Request() req: any) {
    return this.service.createActivity(projectId, req.user.organizationId, dto);
  }

  @Put('activities/:activityId')
  updateActivity(@Param('activityId') activityId: string, @Body() dto: any, @Request() req: any) {
    return this.service.updateActivity(activityId, req.user.organizationId, dto);
  }

  @Delete('activities/:activityId')
  deleteActivity(@Param('activityId') activityId: string, @Request() req: any) {
    return this.service.deleteActivity(activityId, req.user.organizationId);
  }

  @Post('projects/:projectId/activities/duplicate')
  duplicateActivities(@Param('projectId') projectId: string, @Request() req: any) {
    return this.service.duplicateActivities(projectId, req.user.organizationId);
  }

  @Get('activities/:activityId/ics')
  async downloadIcs(@Param('activityId') activityId: string, @Request() req: any, @Res() res: Response) {
    const activity = await this.service['prisma'].projectActivity.findFirst({
      where: { id: activityId, organizationId: req.user.organizationId },
    });
    if (!activity) return res.status(404).json({ message: 'Activité introuvable' });
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
}