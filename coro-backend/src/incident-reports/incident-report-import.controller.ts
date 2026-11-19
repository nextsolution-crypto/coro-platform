import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AdviserActor } from '../auth/project-access';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import {
  AnalyzeIncidentReportImportFileDto,
  CreateIncidentReportImportBatchDto,
  IncidentReportImportListQueryDto,
  StageIncidentReportImportFileDto,
} from './dto/incident-report-import.dto';
import { IncidentReportImportService } from './incident-report-import.service';
import {
  ConfigureIncidentReportImportMappingDto,
  PreviewIncidentReportImportDto,
} from './dto/incident-report-import-mapping.dto';
import { IncidentReportImportMappingService } from './incident-report-import-mapping.service';
import {
  ProcessIncidentReportImportRunDto,
  RollbackIncidentReportImportRunDto,
  StartIncidentReportImportRunDto,
} from './dto/incident-report-import-execution.dto';
import { IncidentReportImportExecutionService } from './incident-report-import-execution.service';

interface AuthenticatedRequest {
  user: AdviserActor;
}

@Controller('organizations/:organizationId/incident-report-imports')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class IncidentReportImportController {
  constructor(
    private readonly imports: IncidentReportImportService,
    private readonly mappings: IncidentReportImportMappingService,
    private readonly executions: IncidentReportImportExecutionService,
  ) {}

  @Post()
  create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateIncidentReportImportBatchDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.imports.createBatch(organizationId, dto, request.user);
  }

  @Get()
  list(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: IncidentReportImportListQueryDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.imports.list(organizationId, query, request.user);
  }

  @Post(':batchId/files')
  stage(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Body() dto: StageIncidentReportImportFileDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.imports.stageFile(organizationId, batchId, dto, request.user);
  }

  @Post(':batchId/files/:fileId/analyze')
  analyze(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Body() dto: AnalyzeIncidentReportImportFileDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.imports.analyze(
      organizationId,
      batchId,
      fileId,
      dto,
      request.user,
    );
  }

  @Post(':batchId/mappings')
  configureMapping(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Body() dto: ConfigureIncidentReportImportMappingDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.mappings.configure(organizationId, batchId, dto, request.user);
  }

  @Post(':batchId/previews')
  preview(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Body() dto: PreviewIncidentReportImportDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.mappings.preview(organizationId, batchId, dto, request.user);
  }

  @Post(':batchId/runs')
  startRun(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Body() dto: StartIncidentReportImportRunDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.executions.start(organizationId, batchId, dto, request.user);
  }

  @Get('runs/:runId')
  getRun(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('runId', ParseUUIDPipe) runId: string,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.executions.get(organizationId, runId, request.user);
  }

  @Post('runs/:runId/process-next')
  processRun(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('runId', ParseUUIDPipe) runId: string,
    @Body() dto: ProcessIncidentReportImportRunDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.executions.processNext(
      organizationId,
      runId,
      dto,
      request.user,
    );
  }

  @Get('runs/:runId/reconciliation')
  reconcileRun(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('runId', ParseUUIDPipe) runId: string,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.executions.reconcile(organizationId, runId, request.user);
  }

  @Post('runs/:runId/rollback')
  rollbackRun(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('runId', ParseUUIDPipe) runId: string,
    @Body() dto: RollbackIncidentReportImportRunDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.executions.rollback(organizationId, runId, dto, request.user);
  }
}
