import { Controller, Get, Put, Post, Param, Body, UseGuards, Request, Res } from '@nestjs/common';
import { Module8Service } from './module8.service';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';

@Controller('projects/:projectId/module8')
@UseGuards(AuthGuard('jwt'))
export class Module8Controller {
  constructor(private readonly service: Module8Service) {}

  @Get()
  getData(@Param('projectId') projectId: string, @Request() req: any) {
    return this.service.getData(projectId, req.user.organizationId);
  }

  @Put()
  saveData(
    @Param('projectId') projectId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.service.saveData(projectId, dto, req.user.organizationId);
  }

  @Post('print-attendance')
  async printAttendance(
    @Param('projectId') projectId: string,
    @Body() body: { language?: string },
    @Request() req: any,
    @Res() res: Response,
  ) {
    const pdf = await this.service.generateAttendancePdf(projectId, req.user.organizationId, body.language || 'fr');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="feuille-presence.pdf"',
    });
    return res.send(pdf);
  }
}