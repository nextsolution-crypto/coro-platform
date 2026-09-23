import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlanningService } from './planning.service';
import { CreatePlanningActivityDto, PlanningActionsDto, PlanningContextDto, PlanningWindowDto } from './planning.dto';

@Controller('planning')
@UseGuards(AuthGuard('jwt'))
export class PlanningController {
  constructor(private readonly planning: PlanningService) {}

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
}
