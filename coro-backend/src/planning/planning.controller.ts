import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlanningService } from './planning.service';
import { PlanningActionsService } from './planning-actions.service';
import { CreateAndPlanActivityDto, CreatePlanningActivityDto, PlanningActionsDto, PlanningContextDto, PlanningTeamPreviewDto, PlanningWindowDto, PlanExistingActivityDto, ReassignPlanningTeamDto, UpdatePlanningSlotDto } from './planning.dto';

@Controller('planning')
@UseGuards(AuthGuard('jwt'))
export class PlanningController {
  constructor(private readonly planning: PlanningService, private readonly mutations: PlanningActionsService) {}

  @Get('team')
  team(@Query() query: PlanningWindowDto, @Request() req: any) {
    return this.planning.team(query, req.user);
  }

  @Get('actions')
  actions(@Query() query: PlanningActionsDto, @Request() req: any) {
    return this.planning.actions(query, req.user);
  }

  @Get('context')
  context(@Query() query: PlanningContextDto, @Request() req: any) {
    return this.planning.context(query, req.user);
  }

  @Post('activities')
  createActivity(@Body() body: CreatePlanningActivityDto, @Request() req: any) {
    return this.planning.createUnplannedActivity(body, req.user);
  }

  @Post('team-preview')
  teamPreview(@Body() body: PlanningTeamPreviewDto, @Request() req: any) {
    return this.planning.teamPreview(body, req.user);
  }

  @Post('activities/:activityId/plan')
  planExisting(@Param('activityId') activityId: string, @Body() body: PlanExistingActivityDto, @Request() req: any) {
    return this.mutations.planExisting(activityId, body, req.user);
  }

  @Post('activities/create-and-plan')
  createAndPlan(@Body() body: CreateAndPlanActivityDto, @Request() req: any) {
    return this.mutations.createAndPlan(body, req.user);
  }

  @Patch('bookings/:bookingId/slot')
  updateSlot(@Param('bookingId') bookingId: string, @Body() body: UpdatePlanningSlotDto, @Request() req: any) {
    return this.mutations.updateSlot(bookingId, body, req.user);
  }

  @Patch('bookings/:bookingId/team')
  reassign(@Param('bookingId') bookingId: string, @Body() body: ReassignPlanningTeamDto, @Request() req: any) {
    return this.mutations.reassign(bookingId, body, req.user);
  }

  @Post('bookings/:bookingId/cancel-schedule')
  cancelSchedule(@Param('bookingId') bookingId: string, @Request() req: any) {
    return this.mutations.cancelSchedule(bookingId, req.user);
  }
}
