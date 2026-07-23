import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
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
    return this.projectsService.findAll(req.user.organizationId);
  }

  @Get('upcoming-updates')
  findUpcomingUpdates(@Request() req: any) {
    return this.projectsService.findUpcomingUpdates(req.user.organizationId);
  }

  @Get('buildings-compliance')
  getBuildingsCompliance(@Request() req: any) {
    return this.projectsService.getBuildingsCompliance(req.user.organizationId);
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
}