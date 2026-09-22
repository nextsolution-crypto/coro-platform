import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlanningService } from './planning.service';
import { PlanningActionsDto, PlanningWindowDto } from './planning.dto';

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
}
