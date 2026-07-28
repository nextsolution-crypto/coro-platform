import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MandateService } from './mandate.service';

@Controller('projects/:projectId')
@UseGuards(AuthGuard('jwt'))
export class MandateController {
  constructor(private readonly service: MandateService) {}

  // Mandat
  @Get('mandate')
  getMandate(@Param('projectId') projectId: string, @Request() req: any) {
    return this.service.getMandate(projectId, req.user.organizationId);
  }

  @Put('mandate')
  saveMandate(@Param('projectId') projectId: string, @Body() dto: any, @Request() req: any) {
    return this.service.saveMandate(projectId, req.user.organizationId, dto);
  }

  // Commentaires
  @Get('comments')
  getComments(@Param('projectId') projectId: string, @Request() req: any) {
    return this.service.getComments(projectId, req.user.organizationId);
  }

  @Post('comments')
  addComment(@Param('projectId') projectId: string, @Body() dto: any, @Request() req: any) {
    const userId = req.user.userId;
    return this.service.addComment(projectId, req.user.organizationId, userId, dto.contenu);
  }

  @Put('comments/:commentId')
  updateComment(@Param('commentId') commentId: string, @Body() dto: any, @Request() req: any) {
    return this.service.updateComment(commentId, req.user.userId, dto.contenu);
  }

  @Delete('comments/:commentId')
  deleteComment(@Param('commentId') commentId: string, @Request() req: any) {
    return this.service.deleteComment(commentId, req.user.userId);
  }

  // Tâches
  @Get('tasks')
  getTasks(@Param('projectId') projectId: string, @Request() req: any) {
    return this.service.getTasks(projectId, req.user.organizationId);
  }

  @Post('tasks/init')
  initTasks(@Param('projectId') projectId: string, @Body() dto: any, @Request() req: any) {
    return this.service.initTasksFromTemplate(projectId, req.user.organizationId, dto.documentType);
  }

  @Put('tasks/:taskId')
  updateTask(@Param('taskId') taskId: string, @Body() dto: any, @Request() req: any) {
    return this.service.updateTask(taskId, req.user.organizationId, dto);
  }

  // Entrées de temps
  @Post('tasks/:taskId/time')
  addTimeEntry(@Param('taskId') taskId: string, @Body() dto: any, @Request() req: any) {
    return this.service.addTimeEntry(taskId, req.user.organizationId, req.user.id, dto);
  }

  @Delete('time/:entryId')
  deleteTimeEntry(@Param('entryId') entryId: string, @Request() req: any) {
    return this.service.deleteTimeEntry(entryId, req.user.id);
  }

  // Feuille d'heures
  @Get('timesheet')
  getTimesheet(
    @Param('projectId') projectId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req: any,
  ) {
    return this.service.getTimesheet(projectId, req.user.organizationId, from, to);
  }
}