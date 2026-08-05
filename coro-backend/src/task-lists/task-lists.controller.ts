import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TaskListsService } from './task-lists.service';

@Controller('task-lists')
@UseGuards(AuthGuard('jwt'))
export class TaskListsController {
  constructor(private readonly service: TaskListsService) {}

  // Toutes les listes disponibles (globales + org)
  @Get()
  getAll(@Request() req: any) {
    return this.service.getAll(req.user.organizationId);
  }

  // Listes globales seulement (SuperAdmin)
  @Get('global')
  getAllGlobal() {
    return this.service.getAllGlobal();
  }

  // Créer une liste globale (SuperAdmin)
  @Post('global')
  createGlobal(@Body() dto: any) {
    return this.service.create(dto, null);
  }

  // Créer une liste pour son organisation
  @Post()
  create(@Body() dto: any, @Request() req: any) {
    return this.service.create(dto, req.user.organizationId);
  }

  // Modifier une liste
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  // Supprimer une liste
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  // Ajouter un template à une liste
  @Post(':id/templates')
  addTemplate(@Param('id') id: string, @Body() dto: any) {
    return this.service.addTemplate(id, dto);
  }

  // Importer une liste dans un projet
  @Post(':id/import/:projectId')
  importToProject(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.service.importToProject(id, projectId, dto.customName, req.user.organizationId);
  }

  // Listes d'un projet
  @Get('project/:projectId')
  getProjectTaskLists(@Param('projectId') projectId: string) {
    return this.service.getProjectTaskLists(projectId);
  }

  // Renommer une instance de liste dans un projet
  @Put('project-list/:id')
  renameProjectTaskList(@Param('id') id: string, @Body() dto: any) {
    return this.service.renameProjectTaskList(id, dto.customName);
  }

  // Supprimer une instance de liste d'un projet
  @Delete('project-list/:id')
  deleteProjectTaskList(@Param('id') id: string) {
    return this.service.deleteProjectTaskList(id);
  }
}