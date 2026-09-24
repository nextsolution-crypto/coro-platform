import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MandateService } from './mandate.service';
import type { Response } from 'express';
import { requireInternal, requireTenantAdmin } from '../auth/work-management-access';

@Controller('projects/:projectId')
@UseGuards(AuthGuard('jwt'))
export class MandateController {
  constructor(private readonly service: MandateService) {}

  // Mandat
  @Get('mandate')
  getMandate(@Param('projectId') projectId: string, @Request() req: any) {
    requireInternal(req.user);
    return this.service.getMandate(projectId, req.user.organizationId);
  }

  @Put('mandate')
  saveMandate(@Param('projectId') projectId: string, @Body() dto: any, @Request() req: any) {
    requireTenantAdmin(req.user);
    return this.service.saveMandate(projectId, req.user.organizationId, dto);
  }

  // Commentaires
  @Get('comments')
  getComments(@Param('projectId') projectId: string, @Request() req: any) {
    requireInternal(req.user);
    return this.service.getComments(projectId, req.user.organizationId);
  }

  @Post('comments')
  addComment(@Param('projectId') projectId: string, @Body() dto: any, @Request() req: any) {
    requireInternal(req.user);
    const userId = req.user.userId;
    return this.service.addComment(projectId, req.user.organizationId, userId, dto.contenu);
  }

  @Put('comments/:commentId')
  updateComment(@Param('projectId') projectId: string, @Param('commentId') commentId: string, @Body() dto: any, @Request() req: any) {
    requireInternal(req.user);
    return this.service.updateComment(projectId, commentId, req.user.userId, req.user.organizationId, dto.contenu);
  }

  @Delete('comments/:commentId')
  deleteComment(@Param('projectId') projectId: string, @Param('commentId') commentId: string, @Request() req: any) {
    requireInternal(req.user);
    return this.service.deleteComment(projectId, commentId, req.user.userId, req.user.organizationId);
  }

  // Tâches
  @Get('tasks')
  getTasks(@Param('projectId') projectId: string, @Request() req: any) {
    requireInternal(req.user);
    return this.service.getTasks(projectId, req.user.organizationId);
  }

  @Post('tasks/init')
  initTasks(@Param('projectId') projectId: string, @Body() dto: any, @Request() req: any) {
    requireInternal(req.user);
    return this.service.initTasksFromTemplate(projectId, req.user.organizationId, dto.documentType);
  }

  @Put('tasks/:taskId')
  updateTask(@Param('taskId') taskId: string, @Body() dto: any, @Request() req: any) {
    requireInternal(req.user);
    return this.service.updateTask(taskId, req.user.organizationId, dto);
  }

  @Put('tasks/:taskId/activity')
  setTaskActivity(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: { activityId: string | null },
    @Request() req: any,
  ) {
    requireInternal(req.user);
    return this.service.setTaskActivity(projectId, taskId, dto.activityId ?? null, req.user);
  }

  // Entrées de temps
  @Post('tasks/:taskId/time')
  addTimeEntry(@Param('taskId') taskId: string, @Body() dto: any, @Request() req: any) {
    requireInternal(req.user);
    return this.service.addTimeEntry(taskId, req.user.organizationId, req.user.userId, dto);
  }

  @Delete('time/:entryId')
  deleteTimeEntry(@Param('projectId') projectId: string, @Param('entryId') entryId: string, @Request() req: any) {
    requireInternal(req.user);
    return this.service.deleteTimeEntry(projectId, entryId, req.user.userId, req.user.organizationId);
  }

  // Feuille d'heures
  @Get('timesheet')
  getTimesheet(
    @Param('projectId') projectId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req: any,
  ) {
    requireInternal(req.user);
    return this.service.getTimesheet(projectId, req.user.organizationId, from, to);
  }

  @Get('timesheet/export')
  async exportTimesheet(
    @Param('projectId') projectId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    requireInternal(req.user);
    const html = await this.service.exportTimesheetPdf(projectId, req.user.organizationId, from, to);
    
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'Letter', printBackground: true, margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } });
    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="feuille-temps-${from}-${to}.pdf"`,
    });
    res.send(pdf);
  }
}
