import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TaskTemplatesService } from './task-templates.service';
import { requireSuperAdmin, requireTenantAdmin } from '../auth/work-management-access';

@Controller('task-templates')
@UseGuards(AuthGuard('jwt'))
export class TaskTemplatesController {
  constructor(private readonly service: TaskTemplatesService) {}

  // SuperAdmin — templates globaux
  @Get()
  getAll(@Request() req: any) {
    requireSuperAdmin(req.user);
    return this.service.getAll();
  }

  @Post()
  create(@Body() dto: any, @Request() req: any) {
    requireSuperAdmin(req.user);
    return this.service.create(dto, null);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    requireSuperAdmin(req.user);
    return this.service.update(id, dto, null);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    requireSuperAdmin(req.user);
    return this.service.delete(id, null);
  }

  @Post('seed')
  seed(@Request() req: any) {
    requireSuperAdmin(req.user);
    return this.service.seedDefaultTemplates();
  }

  // Admin client — templates de son organisation
  @Get('my')
  getMyTemplates(@Request() req: any) {
    requireTenantAdmin(req.user);
    return this.service.getAllForOrg(req.user.organizationId);
  }

  @Post('my')
  createForOrg(@Body() dto: any, @Request() req: any) {
    requireTenantAdmin(req.user);
    return this.service.create(dto, req.user.organizationId);
  }

  @Put('my/:id')
  updateForOrg(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    requireTenantAdmin(req.user);
    return this.service.update(id, dto, req.user.organizationId);
  }

  @Delete('my/:id')
  deleteForOrg(@Param('id') id: string, @Request() req: any) {
    requireTenantAdmin(req.user);
    return this.service.delete(id, req.user.organizationId);
  }

  // Templates globaux + organisation combinés (référence pour admin client)
  @Get('combined')
  getCombined(@Request() req: any) {
    requireTenantAdmin(req.user);
    return this.service.getAllWithGlobal(req.user.organizationId);
  }
}
