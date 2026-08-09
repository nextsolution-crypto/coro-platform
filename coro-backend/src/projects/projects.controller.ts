import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectsService } from './projects.service';
import { AuditService } from '../audit/audit.service';

@Controller('projects')
@UseGuards(AuthGuard('jwt'))
export class ProjectsController {
  constructor(
    private projectsService: ProjectsService,
    private auditService: AuditService,
  ) {}

  @Get()
  findAll(@Request() req: any) {
    // OPERATOR voit seulement ses projets, ADMIN/SUPER_ADMIN voient tout
    const userId = req.user.role === 'OPERATOR' ? req.user.userId : undefined;
    return this.projectsService.findAll(req.user.organizationId, userId);
  }

  @Get('search')
  globalSearch(@Query('q') q: string, @Request() req: any) {
    return this.projectsService.globalSearch(q || '', req.user.organizationId);
  }

  @Get('upcoming-updates')
  findUpcomingUpdates(@Request() req: any) {
    return this.projectsService.findUpcomingUpdates(req.user.organizationId);
  }

  @Get('buildings-compliance')
  getBuildingsCompliance(@Request() req: any) {
    return this.projectsService.getBuildingsCompliance(req.user.organizationId);
  }

  @Get('pending-approval')
  findPendingApproval(@Request() req: any) {
    return this.projectsService.findPendingApproval(req.user.organizationId, req.user.userId);
  }

  @Get(':id/quality-score')
  getQualityScore(@Param('id') id: string, @Request() req: any) {
    return this.projectsService.calculateQualityScore(id, req.user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.projectsService.findOne(id, req.user.organizationId);
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.projectsService.create({
      ...body,
      userId: req.user.userId,
      organizationId: req.user.organizationId,
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    const result = await this.projectsService.update(id, body, req.user.organizationId, req.user.userId);
    if (body.status) {
      await this.auditService.log({
        action: 'STATUS_CHANGE',
        entityType: 'PROJECT',
        entityId: id,
        projectId: id,
        description: `Statut changé vers ${body.status}`,
        metadata: { newStatus: body.status },
        userId: req.user.userId,
        organizationId: req.user.organizationId,
      });
    }
    return result;
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.projectsService.remove(id, req.user.organizationId);
  }

  @Post(':id/submit')
  async submit(@Param('id') id: string, @Request() req: any) {
    const result = await this.projectsService.submitForApproval(id, req.user.organizationId, req.user.userId);
    await this.auditService.log({
      action: 'STATUS_CHANGE',
      entityType: 'PROJECT',
      entityId: id,
      projectId: id,
      description: 'Document soumis pour approbation',
      metadata: { newStatus: 'REVIEW' },
      userId: req.user.userId,
      organizationId: req.user.organizationId,
    });
    return result;
  }

  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() body: { comment?: string },
    @Request() req: any,
  ) {
    const result = await this.projectsService.approve(id, req.user.organizationId, req.user.userId, body.comment);
    await this.auditService.log({
      action: 'STATUS_CHANGE',
      entityType: 'PROJECT',
      entityId: id,
      projectId: id,
      description: `Document approuvé${body.comment ? ` — "${body.comment}"` : ''}`,
      metadata: { newStatus: 'VALIDATED', comment: body.comment },
      userId: req.user.userId,
      organizationId: req.user.organizationId,
    });
    return result;
  }

  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() body: { comment: string },
    @Request() req: any,
  ) {
    const result = await this.projectsService.reject(id, req.user.organizationId, req.user.userId, body.comment);
    await this.auditService.log({
      action: 'STATUS_CHANGE',
      entityType: 'PROJECT',
      entityId: id,
      projectId: id,
      description: `Document rejeté — "${body.comment}"`,
      metadata: { newStatus: 'IN_PROGRESS', comment: body.comment },
      userId: req.user.userId,
      organizationId: req.user.organizationId,
    });
    return result;
  }

  @Post(':id/request-revision')
  async requestRevision(
    @Param('id') id: string,
    @Body() body: { comment?: string },
    @Request() req: any,
  ) {
    const result = await this.projectsService.requestRevision(id, req.user.organizationId, body.comment);
    await this.auditService.log({
      action: 'STATUS_CHANGE',
      entityType: 'PROJECT',
      entityId: id,
      projectId: id,
      description: `Mise à jour demandée${body.comment ? ` — "${body.comment}"` : ''}`,
      metadata: { newStatus: 'IN_PROGRESS', comment: body.comment },
      userId: req.user.userId,
      organizationId: req.user.organizationId,
    });
    return result;
  }
}