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
  constructor(private readonly imports: IncidentReportImportService) {}

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
}
