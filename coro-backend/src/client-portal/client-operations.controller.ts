import {
  BadRequestException,
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
import type { Response } from 'express';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { ClientUserAuthority } from '../auth/coro-authority';
import {
  AssignClientIncidentReportReviewerDto,
  CreateIncidentReportAttachmentDto,
  CreateIncidentReportDto,
  CreateIncidentReportExportDto,
  CreateIncidentReportVersionDto,
  IncidentReportDecisionDto,
  IncidentReportListQueryDto,
  PublishIncidentReportDto,
  RevokeIncidentReportAttachmentDto,
  SubmitIncidentReportDto,
  UpdateIncidentReportDraftDto,
} from '../incident-reports/dto/incident-report.dto';
import { IncidentReportAttachmentsService } from '../incident-reports/incident-report-attachments.service';
import { IncidentReportExportsService } from '../incident-reports/incident-report-exports.service';
import { IncidentReportTemplatesService } from '../incident-reports/incident-report-templates.service';
import { IncidentReportWorkflowService } from '../incident-reports/incident-report-workflow.service';
import { IncidentReportsService } from '../incident-reports/incident-reports.service';
import { IncidentReportHistoricalService } from '../incident-reports/incident-report-historical.service';
import { IncidentReportHistoricalListQueryDto } from '../incident-reports/dto/incident-report-historical.dto';
import {
  incidentReportAttachmentsEnabled,
  incidentReportArchivesEnabled,
  incidentReportImportEnabled,
} from '../incident-reports/incident-reports.config';
import {
  AssociateOperationalLogReportDto,
  CreateOperationalLogEntryDto,
  OperationalLogListQueryDto,
  UpdateOperationalLogEntryDto,
} from '../operational-log/dto/operational-log.dto';
import { OperationalLogService } from '../operational-log/operational-log.service';
import {
  CreateOperationalShiftDto,
  HandoverDecisionDto,
  OpenShiftDto,
  PrepareHandoverDto,
  ShiftListQueryDto,
  ShiftTransitionDto,
} from '../operational-shifts/dto/operational-shifts.dto';
import { OperationalShiftsService } from '../operational-shifts/operational-shifts.service';
import {
  ClientOperationalPermission,
  OperationalFollowUpStatus,
} from '@prisma/client';
import {
  AcknowledgeDirectiveDto,
  CreateDirectiveDto,
  CreateFollowUpDto,
  DirectiveTransitionDto,
  FollowUpTransitionDto,
  OperationalListQueryDto,
} from '../operational-directives/dto/operational-directives.dto';
import { OperationalDirectivesService } from '../operational-directives/operational-directives.service';
import { ClientJwtGuard } from './client-jwt.guard';
import {
  CLIENT_COMMERCIAL_FEATURES,
  ClientFeatureEntitlementService,
} from '../capability-entitlements/client-feature-entitlement.service';

interface ClientOperationsRequest {
  coroAuthority: ClientUserAuthority;
}

class OperationalCapabilitiesQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  buildingId!: string;
}

const clientValidation = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

@Controller(
  'client-portal/organizations/:organizationId/operational-capabilities',
)
@UseGuards(ClientJwtGuard)
@UsePipes(clientValidation)
export class ClientOperationalCapabilitiesController {
  constructor(private readonly features: ClientFeatureEntitlementService) {}

  @Get()
  async list(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: OperationalCapabilitiesQueryDto,
    @Request() req: ClientOperationsRequest,
  ) {
    const { buildingId } = query;
    const decisions = await Promise.all(
      CLIENT_COMMERCIAL_FEATURES.map((feature) =>
        this.features.evaluate({
          authority: req.coroAuthority,
          organizationId,
          buildingId,
          feature,
        }),
      ),
    );
    return {
      organizationId,
      buildingId,
      reportPermissions: Object.values(ClientOperationalPermission).filter(
        (permission) =>
          permission.startsWith('INCIDENT_REPORT_') &&
          (req.coroAuthority.permissions ?? []).includes(permission),
      ),
      capabilities: decisions.map(({ feature, available }) => ({
        feature,
        available,
        reason: available ? 'AVAILABLE' : 'NOT_AVAILABLE',
      })),
      reportFileCapabilities: {
        attachmentUpload: {
          available: incidentReportAttachmentsEnabled(),
          reason: incidentReportAttachmentsEnabled()
            ? 'ANTIVIRUS_PROTECTION_AVAILABLE'
            : 'ANTIVIRUS_PROTECTION_UNAVAILABLE',
        },
        historicalImport: {
          available: incidentReportImportEnabled(),
          reason: incidentReportImportEnabled()
            ? 'ANTIVIRUS_PROTECTION_AVAILABLE'
            : 'IMPORT_DISABLED',
        },
        historicalArchive: {
          available: incidentReportArchivesEnabled(),
          reason: incidentReportArchivesEnabled()
            ? 'AVAILABLE'
            : 'ARCHIVE_ACCESS_DISABLED',
        },
      },
    };
  }
}

@Controller('client-portal/organizations/:organizationId/incident-reports')
@UseGuards(ClientJwtGuard)
@UsePipes(clientValidation)
export class ClientIncidentReportsController {
  constructor(
    private readonly reports: IncidentReportsService,
    private readonly workflow: IncidentReportWorkflowService,
    private readonly attachments: IncidentReportAttachmentsService,
    private readonly templates: IncidentReportTemplatesService,
    private readonly exports: IncidentReportExportsService,
    private readonly historical: IncidentReportHistoricalService,
  ) {}

  @Get('historical')
  historicalList(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Query() query: IncidentReportHistoricalListQueryDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.historical.list(org, query, req.coroAuthority);
  }

  @Get('historical/:recordId')
  historicalGet(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.historical.get(org, recordId, req.coroAuthority);
  }

  @Get('forms/catalog')
  catalog(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Query('buildingId', ParseUUIDPipe) building: string,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.templates.catalog(org, req.coroAuthority, building);
  }
  @Get('forms/templates')
  templatesList(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Query('buildingId', ParseUUIDPipe) building: string,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.templates.list(org, req.coroAuthority, building);
  }
  @Post()
  create(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Body() dto: CreateIncidentReportDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.reports.create(org, dto, req.coroAuthority);
  }
  @Get()
  list(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Query() query: IncidentReportListQueryDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.reports.list(org, query, req.coroAuthority);
  }
  @Get('review/queue')
  queue(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Query('buildingId', ParseUUIDPipe) building: string,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.workflow.queue(org, building, req.coroAuthority);
  }
  @Get(':id')
  get(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.reports.get(org, id, req.coroAuthority);
  }
  @Patch(':id')
  update(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncidentReportDraftDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.reports.updateDraft(org, id, dto, req.coroAuthority);
  }
  @Post(':id/versions')
  version(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateIncidentReportVersionDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.reports.createVersion(org, id, dto, req.coroAuthority);
  }
  @Get(':id/versions')
  versions(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.reports.versions(org, id, req.coroAuthority);
  }
  @Post(':id/submit')
  submit(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitIncidentReportDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.reports.submit(org, id, dto, req.coroAuthority);
  }
  @Post(':id/reviewer')
  reviewer(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignClientIncidentReportReviewerDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.workflow.assignClientReviewer(org, id, dto, req.coroAuthority);
  }
  @Get('reviewers/eligible')
  eligibleReviewers(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Query('buildingId', ParseUUIDPipe) building: string,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.workflow.eligibleClientReviewers(
      org,
      building,
      req.coroAuthority,
    );
  }
  @Post(':id/decisions')
  decide(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: IncidentReportDecisionDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.workflow.decide(org, id, dto, req.coroAuthority);
  }
  @Post(':id/publish')
  publish(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishIncidentReportDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.workflow.publish(org, id, dto, req.coroAuthority);
  }
  @Post(':id/attachments')
  attach(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateIncidentReportAttachmentDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.attachments.create(org, id, dto, req.coroAuthority);
  }
  @Get(':id/attachments/:attachmentId')
  async attachment(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Request() req: ClientOperationsRequest,
    @Res() res: Response,
  ) {
    const file = await this.attachments.download(
      org,
      id,
      attachmentId,
      req.coroAuthority,
    );
    res.setHeader('Content-Type', file.mediaType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(file.bytes);
  }
  @Post(':id/attachments/:attachmentId/revoke')
  revokeAttachment(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Body() dto: RevokeIncidentReportAttachmentDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.attachments.revoke(
      org,
      id,
      attachmentId,
      dto,
      req.coroAuthority,
    );
  }
  @Post(':id/exports')
  export(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateIncidentReportExportDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.exports.create(org, id, dto, req.coroAuthority);
  }
  @Get(':id/exports')
  exportList(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.exports.list(org, id, req.coroAuthority);
  }
  @Get(':id/exports/:exportId/download')
  async exportDownload(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('exportId', ParseUUIDPipe) exportId: string,
    @Request() req: ClientOperationsRequest,
    @Res() res: Response,
  ) {
    const file = await this.exports.download(
      org,
      id,
      exportId,
      req.coroAuthority,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(file.bytes);
  }
}

@Controller('client-portal/organizations/:organizationId/operational-log')
@UseGuards(ClientJwtGuard)
@UsePipes(clientValidation)
export class ClientOperationalLogController {
  constructor(private readonly service: OperationalLogService) {}
  @Post('entries') create(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Body() dto: CreateOperationalLogEntryDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.service.create(org, dto, req.coroAuthority);
  }
  @Get('entries') list(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Query() query: OperationalLogListQueryDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.service.list(org, query, req.coroAuthority);
  }
  @Get('entries/:id') get(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.service.get(org, id, req.coroAuthority);
  }
  @Get('entries/:id/history') history(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.service.history(org, id, req.coroAuthority);
  }
  @Patch('entries/:id') update(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOperationalLogEntryDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.service.update(org, id, dto, req.coroAuthority);
  }
  @Post('entries/:id/report-association') associate(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssociateOperationalLogReportDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.service.associateReport(org, id, dto, req.coroAuthority);
  }
}

@Controller('client-portal/organizations/:organizationId/operational-shifts')
@UseGuards(ClientJwtGuard)
@UsePipes(clientValidation)
export class ClientOperationalShiftsController {
  constructor(private readonly service: OperationalShiftsService) {}
  @Post() create(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Body() dto: CreateOperationalShiftDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.service.create(org, dto, req.coroAuthority);
  }
  @Get() list(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Query() query: ShiftListQueryDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.service.list(org, query, req.coroAuthority);
  }
  @Get(':id') get(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.service.get(org, id, req.coroAuthority);
  }
  @Post(':id/open') open(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OpenShiftDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.service.open(org, id, dto, req.coroAuthority);
  }
  @Post(':id/handover') handover(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PrepareHandoverDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.service.prepareHandover(org, id, dto, req.coroAuthority);
  }
  @Post('handovers/:id/decision') decision(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HandoverDecisionDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.service.decideHandover(org, id, dto, req.coroAuthority);
  }
  @Post(':id/close') close(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ShiftTransitionDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.service.close(org, id, dto, req.coroAuthority);
  }
  @Post(':id/cancel') cancel(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ShiftTransitionDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.service.cancel(org, id, dto, req.coroAuthority);
  }
}

@Controller('client-portal/organizations/:organizationId/operations')
@UseGuards(ClientJwtGuard)
@UsePipes(clientValidation)
export class ClientOperationalDirectivesController {
  constructor(private readonly service: OperationalDirectivesService) {}
  @Post('directives') createDirective(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Body() dto: CreateDirectiveDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.service.createDirective(org, dto, req.coroAuthority);
  }
  @Get('directives') listDirectives(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Query() query: OperationalListQueryDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.service.listDirectives(org, query, req.coroAuthority);
  }
  @Post('directives/:id/submit') submit(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DirectiveTransitionDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.service.transitionDirective(
      org,
      id,
      'SUBMITTED',
      dto,
      req.coroAuthority,
    );
  }
  @Post('directives/:id/approve') approve(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DirectiveTransitionDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.service.transitionDirective(
      org,
      id,
      'APPROVED',
      dto,
      req.coroAuthority,
    );
  }
  @Post('directives/:id/publish') publish(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DirectiveTransitionDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.service.transitionDirective(
      org,
      id,
      'PUBLISHED',
      dto,
      req.coroAuthority,
    );
  }
  @Post('directives/:id/revoke') revoke(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DirectiveTransitionDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.service.transitionDirective(
      org,
      id,
      'REVOKED',
      dto,
      req.coroAuthority,
    );
  }
  @Post('directives/:id/acknowledge') acknowledge(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcknowledgeDirectiveDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.service.acknowledge(org, id, dto, req.coroAuthority);
  }
  @Post('follow-ups') createFollowUp(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Body() dto: CreateFollowUpDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.service.createFollowUp(org, dto, req.coroAuthority);
  }
  @Get('follow-ups') listFollowUps(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Query() query: OperationalListQueryDto,
    @Request() req: ClientOperationsRequest,
  ) {
    return this.service.listFollowUps(org, query, req.coroAuthority);
  }
  @Post('follow-ups/:id/:transition') transition(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('transition') transition: string,
    @Body() dto: FollowUpTransitionDto,
    @Request() req: ClientOperationsRequest,
  ) {
    const targets: Record<string, OperationalFollowUpStatus> = {
      assign: 'ASSIGNED',
      start: 'IN_PROGRESS',
      complete: 'COMPLETED',
      verify: 'VERIFIED',
      close: 'CLOSED',
      cancel: 'CANCELLED',
      reopen: 'OPEN',
    };
    const target = targets[transition];
    if (!target) throw new BadRequestException('Transition inconnue.');
    return this.service.transitionFollowUp(
      org,
      id,
      target,
      dto,
      req.coroAuthority,
    );
  }
}
