import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdviserActor } from '../auth/project-access';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import {
  CreateIncidentReportDto,
  CreateIncidentReportVersionDto,
  IncidentReportListQueryDto,
  SubmitIncidentReportDto,
  UpdateIncidentReportDraftDto,
  AssignIncidentReportReviewerDto,
  IncidentReportDecisionDto,
  PublishIncidentReportDto,
  CreateIncidentReportAttachmentDto,
  RevokeIncidentReportAttachmentDto,
  PublishIncidentReportTemplateDto,
  CreateIncidentReportExportDto,
} from './dto/incident-report.dto';
import { IncidentReportsService } from './incident-reports.service';
import { IncidentReportWorkflowService } from './incident-report-workflow.service';
import { IncidentReportAttachmentsService } from './incident-report-attachments.service';
import { IncidentReportTemplatesService } from './incident-report-templates.service';
import { IncidentReportExportsService } from './incident-report-exports.service';
import type { Response } from 'express';

interface AuthenticatedRequest {
  user: AdviserActor;
}

@Controller('organizations/:organizationId/incident-reports')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class IncidentReportsController {
  constructor(
    private readonly service: IncidentReportsService,
    private readonly workflow: IncidentReportWorkflowService,
    private readonly attachments: IncidentReportAttachmentsService,
    private readonly templates: IncidentReportTemplatesService,
    private readonly exports: IncidentReportExportsService,
  ) {}

  @Get('forms/catalog')
  formCatalog(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('buildingId', ParseUUIDPipe) buildingId: string,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.templates.catalog(organizationId, request.user, buildingId);
  }

  @Get('forms/templates')
  formTemplates(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('buildingId', ParseUUIDPipe) buildingId: string,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.templates.list(organizationId, request.user, buildingId);
  }

  @Post('forms/templates')
  publishTemplate(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: PublishIncidentReportTemplateDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.templates.publish(organizationId, dto, request.user);
  }

  @Post()
  create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateIncidentReportDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.service.create(organizationId, dto, request.user);
  }

  @Get()
  list(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: IncidentReportListQueryDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.service.list(organizationId, query, request.user);
  }

  @Get(':id')
  get(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.service.get(organizationId, id, request.user);
  }

  @Patch(':id')
  update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncidentReportDraftDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.service.updateDraft(organizationId, id, dto, request.user);
  }

  @Post(':id/versions')
  createVersion(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateIncidentReportVersionDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.service.createVersion(organizationId, id, dto, request.user);
  }

  @Post(':id/submit')
  submit(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitIncidentReportDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.service.submit(organizationId, id, dto, request.user);
  }

  @Get(':id/versions')
  versions(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.service.versions(organizationId, id, request.user);
  }

  @Post(':id/reviewer')
  assignReviewer(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignIncidentReportReviewerDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.workflow.assign(organizationId, id, dto, request.user);
  }

  @Post(':id/decisions')
  decide(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: IncidentReportDecisionDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.workflow.decide(organizationId, id, dto, request.user);
  }

  @Post(':id/publish')
  publish(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishIncidentReportDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.workflow.publish(organizationId, id, dto, request.user);
  }

  @Get('review/queue')
  reviewQueue(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('buildingId', ParseUUIDPipe) buildingId: string,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.workflow.queue(organizationId, buildingId, request.user);
  }

  @Post(':id/attachments')
  addAttachment(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateIncidentReportAttachmentDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.attachments.create(organizationId, id, dto, request.user);
  }

  @Get(':id/attachments/:attachmentId')
  async downloadAttachment(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Request() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const file = await this.attachments.download(
      organizationId,
      id,
      attachmentId,
      request.user,
    );
    response.setHeader('Content-Type', file.mediaType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    );
    response.setHeader('Cache-Control', 'private, no-store');
    response.send(file.bytes);
  }

  @Post(':id/attachments/:attachmentId/revoke')
  revokeAttachment(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Body() dto: RevokeIncidentReportAttachmentDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.attachments.revoke(
      organizationId,
      id,
      attachmentId,
      dto,
      request.user,
    );
  }

  @Post(':id/exports')
  createExport(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateIncidentReportExportDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.exports.create(organizationId, id, dto, request.user);
  }

  @Get(':id/exports')
  listExports(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.exports.list(organizationId, id, request.user);
  }

  @Get(':id/exports/:exportId/download')
  async downloadExport(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('exportId', ParseUUIDPipe) exportId: string,
    @Request() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const file = await this.exports.download(
      organizationId,
      id,
      exportId,
      request.user,
    );
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    );
    response.setHeader('Cache-Control', 'private, no-store');
    response.send(file.bytes);
  }
}
