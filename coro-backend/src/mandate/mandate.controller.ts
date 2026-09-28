import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MandateService } from './mandate.service';
import type { Response } from 'express';
import { requireInternal, requireTenantAdmin } from '../auth/work-management-access';
import { MandateServicesService } from './mandate-services.service';
import { SaveMandateServicesDto } from './mandate-services.dto';
import { MandateOperationsPreviewService } from './mandate-operations-preview.service';
import { MandateOperationsPreviewDto } from './mandate-operations-preview.dto';

@Controller('projects/:projectId')
@UseGuards(AuthGuard('jwt'))
export class MandateController {
  constructor(private readonly service: MandateService, private readonly mandateServices: MandateServicesService,
    private readonly operationsPreview: MandateOperationsPreviewService) {}

  @Get('mandate/services')
  getMandateServices(@Param('projectId') projectId: string, @Request() req: any) {
    requireInternal(req.user);
    return this.mandateServices.list(projectId, req.user);
  }

  @Put('mandate/services')
  saveMandateServices(@Param('projectId') projectId: string, @Body() dto: SaveMandateServicesDto, @Request() req: any) {
    requireTenantAdmin(req.user);
    return this.mandateServices.save(projectId, req.user, dto);
  }

  @Post('mandate/services/operations/preview')
  previewMandateServiceOperations(@Param('projectId') projectId: string, @Body() dto: MandateOperationsPreviewDto,
    @Request() req: any) {
    requireInternal(req.user);
    return this.operationsPreview.preview(projectId, req.user, dto.expectedRevision);
  }

  // Mandat
  @Get('mandate')
  getMandate(@Param('projectId') projectId: string, @Request() req: any) {
    requireInternal(req.user);
    return this.service.getMandate(projectId, req.user);
  }

  @Get('mandate/work')
  getWork(@Param('projectId') projectId: string, @Request() req: any) {
    requireInternal(req.user);
    return this.service.getWork(projectId, req.user);
  }

  @Put('mandate')
  saveMandate(@Param('projectId') projectId: string, @Body() dto: any, @Request() req: any) {
    requireTenantAdmin(req.user);
    return this.service.saveMandate(projectId, req.user, dto);
  }

  // Commentaires
  @Get('comments')
  getComments(@Param('projectId') projectId: string, @Request() req: any) {
    requireInternal(req.user);
    return this.service.getComments(projectId, req.user);
  }

  @Post('comments')
  addComment(@Param('projectId') projectId: string, @Body() dto: any, @Request() req: any) {
    requireInternal(req.user);
    return this.service.addComment(projectId, req.user, dto.contenu);
  }

  @Put('comments/:commentId')
  updateComment(@Param('projectId') projectId: string, @Param('commentId') commentId: string, @Body() dto: any, @Request() req: any) {
    requireInternal(req.user);
    return this.service.updateComment(projectId, commentId, req.user, dto.contenu);
  }

  @Delete('comments/:commentId')
  deleteComment(@Param('projectId') projectId: string, @Param('commentId') commentId: string, @Request() req: any) {
    requireInternal(req.user);
    return this.service.deleteComment(projectId, commentId, req.user);
  }

  // Tâches
  @Get('tasks')
  getTasks(@Param('projectId') projectId: string, @Request() req: any) {
    requireInternal(req.user);
    return this.service.getTasks(projectId, req.user);
  }

  @Post('tasks/init')
  initTasks(@Param('projectId') projectId: string, @Body() dto: any, @Request() req: any) {
    requireInternal(req.user);
    return this.service.initTasksFromTemplate(projectId, req.user, dto.documentType);
  }

  @Post('tasks')
  createTask(@Param('projectId') projectId: string, @Body() dto: any, @Request() req: any) {
    requireInternal(req.user);
    return this.service.createTask(projectId, dto, req.user);
  }

  @Put('tasks/:taskId')
  updateTask(@Param('projectId') projectId: string, @Param('taskId') taskId: string, @Body() dto: any, @Request() req: any) {
    requireInternal(req.user);
    return this.service.updateTask(projectId, taskId, req.user, dto);
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
  addTimeEntry(@Param('projectId') projectId: string, @Param('taskId') taskId: string, @Body() dto: any, @Request() req: any) {
    requireInternal(req.user);
    return this.service.addTimeEntry(projectId, taskId, req.user, dto);
  }

  @Delete('time/:entryId')
  deleteTimeEntry(@Param('projectId') projectId: string, @Param('entryId') entryId: string, @Request() req: any) {
    requireInternal(req.user);
    return this.service.deleteTimeEntry(projectId, entryId, req.user);
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
    return this.service.getTimesheet(projectId, req.user, from, to);
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
    const html = await this.service.exportTimesheetPdf(projectId, req.user, from, to);
    
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
