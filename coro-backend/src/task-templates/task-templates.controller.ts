import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TaskTemplatesService } from './task-templates.service';
import { requireSuperAdmin, requireTenantAdmin } from '../auth/work-management-access';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import { CreateTaskTemplateDto, UpdateTaskTemplateDto } from './dto/task-template.dto';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';

@Controller('task-templates')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard, PlatformRolesGuard)
export class TaskTemplatesController {
  constructor(private readonly service: TaskTemplatesService) {}

  // SuperAdmin — templates globaux
  @Get()
  @SuperAdminOnly()
  getAll(@Request() req: any) {
    requireSuperAdmin(req.user);
    return this.service.getAll();
  }

  @Post()
  @SuperAdminOnly()
  create(@Body() dto: CreateTaskTemplateDto, @Request() req: any) {
    requireSuperAdmin(req.user);
    return this.service.createGlobal(dto, req.user);
  }

  @Put(':id')
  @SuperAdminOnly()
  update(@Param('id') id: string, @Body() dto: UpdateTaskTemplateDto, @Request() req: any) {
    requireSuperAdmin(req.user);
    return this.service.updateGlobal(id, dto, req.user);
  }

  @Delete(':id')
  @SuperAdminOnly()
  delete(@Param('id') id: string, @Request() req: any) {
    requireSuperAdmin(req.user);
    return this.service.deleteGlobal(id, req.user);
  }

  @Post('seed')
  @SuperAdminOnly()
  seed(@Request() req: any) {
    requireSuperAdmin(req.user);
    return this.service.seedDefaultTemplates(req.user);
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
