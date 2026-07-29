import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TimelogService } from './timelog.service';

@Controller('timelog')
@UseGuards(AuthGuard('jwt'))
export class TimelogController {
  constructor(private readonly service: TimelogService) {}

  @Get('catalog')
  getCatalog() {
    return this.service.getCatalog();
  }

  @Get('me')
  getMyTimelog(
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req: any,
  ) {
    return this.service.getMyTimelog(req.user.userId, req.user.organizationId, from, to);
  }

  @Post('me')
  addEntry(@Body() dto: any, @Request() req: any) {
    return this.service.addEntry(req.user.userId, req.user.organizationId, dto);
  }

  @Put('me/:entryId')
  updateEntry(@Param('entryId') entryId: string, @Body() dto: any, @Request() req: any) {
    return this.service.updateEntry(entryId, req.user.userId, dto);
  }

  @Delete('me/:entryId')
  deleteEntry(@Param('entryId') entryId: string, @Request() req: any) {
    return this.service.deleteEntry(entryId, req.user.userId);
  }

  @Get('team')
  getTeamTimelog(
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req: any,
  ) {
    return this.service.getTeamTimelog(req.user.organizationId, from, to);
  }
}