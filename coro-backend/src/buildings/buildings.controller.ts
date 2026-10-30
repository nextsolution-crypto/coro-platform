import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UsePipes, ValidationPipe, Request, Headers } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BuildingsService } from './buildings.service';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import { requireInternal, requireTenantAdmin } from '../auth/work-management-access';
import { CreateBuildingDto, UpdateBuildingDto } from './dto/building.dto';

@Controller('buildings')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class BuildingsController {
  constructor(private buildingsService: BuildingsService) {}

  @Get()
  findAll(@Query('clientId') clientId: string | undefined, @Request() req: any) {
    requireInternal(req.user);
    return this.buildingsService.findAll(req.user, clientId);
  }

  @Get(':id/projects')
  findProjects(@Param('id') id: string, @Request() req: any) {
    requireInternal(req.user);
    return this.buildingsService.findProjects(id, req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    requireInternal(req.user);
    return this.buildingsService.findOne(id, req.user);
  }

  @Post()
  create(@Body() body: CreateBuildingDto, @Headers('idempotency-key') idempotencyKey: string | undefined, @Request() req: any) {
    requireTenantAdmin(req.user);
    return this.buildingsService.create(body, req.user, idempotencyKey);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateBuildingDto, @Request() req: any) {
    requireTenantAdmin(req.user);
    return this.buildingsService.update(id, body, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    requireTenantAdmin(req.user);
    return this.buildingsService.remove(id, req.user);
  }
}
