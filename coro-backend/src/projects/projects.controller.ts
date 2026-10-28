import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectsService } from './projects.service';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import { AuditService } from '../audit/audit.service';
import { ClientPortalService } from '../client-portal/client-portal.service';
import { ApprovalService } from '../approval/approval.service';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('projects')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
export class ProjectsController {
  constructor(
    private projectsService: ProjectsService,
    private auditService: AuditService,
    private clientPortalService: ClientPortalService,
    private approvalService: ApprovalService,
  ) {}

  @Get()
  findAll(@Request() req: any) {
    return this.projectsService.findAll(req.user);
  }

  @Get('list-summary')
  getListSummary(@Request() req: any) {
    return this.projectsService.getListSummary(req.user);
  }

  @Get('filter-users')
  getFilterUsers(@Request() req: any) {
    return this.projectsService.getFilterUsers(req.user);
  }

  @Post('bulk-deactivate')
  bulkDeactivate(@Body() body: { projectIds?: string[] }, @Request() req: any) {
    return this.projectsService.bulkDeactivate(body.projectIds || [], req.user);
  }

  @Get('search')
  globalSearch(@Query('q') q: string, @Request() req: any) {
    return this.projectsService.globalSearch(q || '', req.user);
  }

  @Get('upcoming-updates')
  findUpcomingUpdates(@Request() req: any) {
    return this.projectsService.findUpcomingUpdates(req.user);
  }

  @Get('buildings-compliance')
  getBuildingsCompliance(@Request() req: any) {
    return this.projectsService.getBuildingsCompliance(req.user.organizationId);
  }

  @Get('pending-approval')
  findPendingApproval(@Request() req: any) {
    return this.projectsService.findPendingApproval(req.user);
  }

  @Get('dashboard/late-tasks')
  findLateTasks(@Request() req: any) {
    return this.projectsService.findLateTasks(req.user);
  }

  @Get(':id/quality-score')
  getQualityScore(@Param('id') id: string, @Request() req: any) {
    return this.projectsService.calculateQualityScore(id, req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.projectsService.findOne(id, req.user);
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.projectsService.create(
      {
        ...body,
        userId: req.user.userId,
        organizationId: req.user.organizationId,
      },
      req.user,
    );
  }

  @Put(':id')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() body: UpdateProjectDto,
    @Request() req: any,
  ) {
    const result = await this.projectsService.update(id, body, req.user);
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
    return this.projectsService.remove(id, req.user);
  }

  @Post(':id/submit')
  async submit(@Param('id') id: string, @Request() req: any) {
    return this.approvalService.submit(id, req.user);
  }

  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() body: { comment?: string },
    @Request() req: any,
  ) {
    return this.approvalService.approve(id, req.user);
  }

  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() body: { comment: string },
    @Request() req: any,
  ) {
    return this.approvalService.requestRevision(
      id,
      req.user,
      body.comment,
    );
  }

  @Post(':id/request-revision')
  async requestRevision(
    @Param('id') id: string,
    @Body() body: { comment?: string },
    @Request() req: any,
  ) {
    return this.approvalService.requestRevision(
      id,
      req.user,
      body.comment,
    );
  }

  @Get(':id/comments')
  @UseGuards(AuthGuard('jwt'))
  async getComments(@Param('id') id: string, @Request() req: any) {
    return this.projectsService.getComments(id, req.user);
  }

  @Get(':id/engagement')
  @UseGuards(AuthGuard('jwt'))
  async getEngagement(@Param('id') id: string, @Request() req: any) {
    await this.projectsService.findOne(id, req.user);
    return this.clientPortalService.getEngagementForAuthorizedProject(id);
  }
}
