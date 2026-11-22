import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, UsePipes, ValidationPipe, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TimelogService } from './timelog.service';
import { requireInternal, requireTenantAdmin } from '../auth/work-management-access';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import { CreateTimelogCategoryDto, CreateTimelogEntryDto, DeleteTimelogEntryDto, ReopenTimePeriodDto, TimelogRangeDto, UpdateTimelogCategoryDto, UpdateTimelogEntryDto } from './timelog.dto';

@Controller('timelog')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class TimelogController {
  constructor(private readonly service: TimelogService) {}

  @Get('catalog')
  getCatalog(@Request() req: any) {
    requireInternal(req.user);
    return this.service.getCatalog(req.user.organizationId);
  }

  @Post('catalog')
  addCategory(@Body() dto: CreateTimelogCategoryDto, @Request() req: any) {
    requireTenantAdmin(req.user);
    return this.service.addCategory(dto, req.user.organizationId);
  }

  @Put('catalog/:key')
  updateCategory(@Param('key') key: string, @Body() dto: UpdateTimelogCategoryDto, @Request() req: any) {
    requireTenantAdmin(req.user);
    return this.service.updateCategory(key, dto, req.user.organizationId);
  }

  @Delete('catalog/:key')
  deleteCategory(@Param('key') key: string, @Request() req: any) {
    requireTenantAdmin(req.user);
    return this.service.deleteCategory(key, req.user.organizationId);
  }

  @Get('me')
  getMyTimelog(@Query() query: TimelogRangeDto, @Request() req: any) {
    requireInternal(req.user);
    return this.service.getMyTimelog(req.user.userId, req.user.organizationId, query.from, query.to);
  }

  @Post('me')
  addEntry(@Body() dto: CreateTimelogEntryDto, @Request() req: any) {
    requireInternal(req.user);
    return this.service.addEntry(req.user.userId, req.user.organizationId, dto);
  }

  @Put('me/:entryId')
  updateEntry(@Param('entryId') entryId: string, @Body() dto: UpdateTimelogEntryDto, @Request() req: any) {
    requireInternal(req.user);
    return this.service.updateEntry(entryId, req.user.userId, req.user.organizationId, dto);
  }

  @Delete('me/:entryId')
  deleteEntry(@Param('entryId') entryId: string, @Query() query: DeleteTimelogEntryDto, @Request() req: any) {
    requireInternal(req.user);
    return this.service.deleteEntry(entryId, req.user.userId, req.user.organizationId, query.lockVersion);
  }

  @Get('team')
  getTeamTimelog(@Query() query: TimelogRangeDto, @Request() req: any) {
    requireTenantAdmin(req.user);
    return this.service.getTeamTimelog(req.user.organizationId, query.from, query.to);
  }

  // ── Clôture mensuelle des saisies (M6-02) ──
  @Get('periods')
  listPeriods(@Request() req: any) {
    requireTenantAdmin(req.user);
    return this.service.listPeriods(req.user.organizationId);
  }

  @Post('periods/:period/close')
  closePeriod(@Param('period') period: string, @Request() req: any) {
    requireTenantAdmin(req.user);
    return this.service.closePeriod(req.user.organizationId, period, req.user.userId);
  }

  @Post('periods/:period/reopen')
  reopenPeriod(@Param('period') period: string, @Body() dto: ReopenTimePeriodDto, @Request() req: any) {
    requireTenantAdmin(req.user);
    return this.service.reopenPeriod(req.user.organizationId, period, dto.reason, req.user.userId);
  }
}
