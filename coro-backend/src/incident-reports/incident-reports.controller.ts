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
} from './dto/incident-report.dto';
import { IncidentReportsService } from './incident-reports.service';

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
  constructor(private readonly service: IncidentReportsService) {}

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
}
