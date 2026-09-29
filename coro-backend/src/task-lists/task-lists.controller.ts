import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TaskListsService } from './task-lists.service';
import { requireInternal, requireSuperAdmin, requireTenantAdmin } from '../auth/work-management-access';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import { AddTaskListTemplateDto, CreateTaskListDto, UpdateTaskListDto } from './dto/task-list.dto';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';

@Controller('task-lists')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard, PlatformRolesGuard)
export class TaskListsController {
  constructor(private readonly service: TaskListsService) {}

  // Toutes les listes disponibles (globales + org)
  @Get()
  getAll(@Request() req: any) {
    requireInternal(req.user);
    return this.service.getAll(req.user.organizationId);
  }

  // Listes globales seulement (SuperAdmin)
  @Get('global')
  @SuperAdminOnly()
  getAllGlobal(@Request() req: any) {
    requireSuperAdmin(req.user);
    return this.service.getAllGlobal();
  }

  // Créer une liste globale (SuperAdmin)
  @Post('global')
  @SuperAdminOnly()
  createGlobal(@Body() dto: CreateTaskListDto, @Request() req: any) {
    requireSuperAdmin(req.user);
    return this.service.createGlobal(dto, req.user);
  }

  @Put('global/:id')
  updateGlobal(@Param('id') id: string, @Body() dto: UpdateTaskListDto, @Request() req: any) {
    requireSuperAdmin(req.user);
    return this.service.updateGlobal(id, dto, req.user);
  }

  @Delete('global/:id')
  deleteGlobal(@Param('id') id: string, @Request() req: any) {
    requireSuperAdmin(req.user);
    return this.service.deleteGlobal(id, req.user);
  }

  // Créer une liste pour son organisation
  @Post()
  create(@Body() dto: any, @Request() req: any) {
    requireTenantAdmin(req.user);
    return this.service.create(dto, req.user.organizationId);
  }

  // Modifier une liste
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    requireTenantAdmin(req.user);
    return this.service.update(id, dto, req.user.organizationId);
  }

  // Supprimer une liste
  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    requireTenantAdmin(req.user);
    return this.service.delete(id, req.user.organizationId);
  }

  // Ajouter un template à une liste
  @Post(':id/templates')
  addTemplate(@Param('id') id: string, @Body() dto: AddTaskListTemplateDto, @Request() req: any) {
    requireTenantAdmin(req.user);
    return this.service.addTemplate(id, dto, req.user.organizationId);
  }

  // Importer une liste dans un projet
  @Post(':id/import/:projectId')
  importToProject(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    requireInternal(req.user);
    return this.service.importToProject(id, projectId, dto.customName, req.user.organizationId);
  }

  // Listes d'un projet
  @Get('project/:projectId')
  getProjectTaskLists(@Param('projectId') projectId: string, @Request() req: any) {
    requireInternal(req.user);
    return this.service.getProjectTaskLists(projectId, req.user.organizationId);
  }

  // Renommer une instance de liste dans un projet
  @Put('project-list/:id')
  renameProjectTaskList(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    requireInternal(req.user);
    return this.service.renameProjectTaskList(id, dto.customName, req.user.organizationId);
  }

  // Supprimer une instance de liste d'un projet
  @Delete('project-list/:id')
  deleteProjectTaskList(@Param('id') id: string, @Request() req: any) {
    requireInternal(req.user);
    return this.service.deleteProjectTaskList(id, req.user.organizationId);
  }
}
