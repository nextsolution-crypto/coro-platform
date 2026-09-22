import { Body, Controller, Get, Param, Post, Delete, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WorkSchedulesService } from './work-schedules.service';
import type { ScheduleInput, UnavailabilityInput } from './work-schedules.service';

@Controller('work-schedules')
@UseGuards(AuthGuard('jwt'))
export class WorkSchedulesController {
  constructor(private readonly service: WorkSchedulesService) {}

  @Get('me')
  mySchedule(@Request() req: any) { return this.service.current(req.user.userId, req.user); }

  @Get('users/:userId')
  current(@Param('userId') userId: string, @Request() req: any) { return this.service.current(userId, req.user); }

  @Get('users/:userId/history')
  history(@Param('userId') userId: string, @Request() req: any) { return this.service.history(userId, req.user); }

  @Post('users/:userId')
  replace(@Param('userId') userId: string, @Body() body: ScheduleInput, @Request() req: any) {
    return this.service.replace(userId, body, req.user);
  }

  @Get('me/unavailabilities')
  myUnavailabilities(@Request() req: any) { return this.service.listUnavailability(req.user.userId, req.user); }

  @Post('me/unavailabilities')
  createMine(@Body() body: UnavailabilityInput, @Request() req: any) {
    return this.service.createUnavailability(req.user.userId, body, req.user);
  }

  @Get('users/:userId/unavailabilities')
  userUnavailabilities(@Param('userId') userId: string, @Request() req: any) {
    return this.service.listUnavailability(userId, req.user);
  }

  @Post('users/:userId/unavailabilities')
  createForUser(@Param('userId') userId: string, @Body() body: UnavailabilityInput, @Request() req: any) {
    return this.service.createUnavailability(userId, body, req.user);
  }

  @Delete('unavailabilities/:id')
  cancel(@Param('id') id: string, @Request() req: any) { return this.service.cancelUnavailability(id, req.user); }
}
