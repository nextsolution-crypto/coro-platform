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
  AssociateOperationalLogReportDto,
  CreateOperationalLogEntryDto,
  OperationalLogListQueryDto,
  UpdateOperationalLogEntryDto,
} from './dto/operational-log.dto';
import { OperationalLogService } from './operational-log.service';

interface AuthenticatedRequest {
  user: AdviserActor;
}

@Controller('organizations/:organizationId/operational-log')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class OperationalLogController {
  constructor(private readonly service: OperationalLogService) {}

  @Post('entries')
  create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateOperationalLogEntryDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.service.create(organizationId, dto, request.user);
  }

  @Get('entries')
  list(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: OperationalLogListQueryDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.service.list(organizationId, query, request.user);
  }

  @Get('entries/:id')
  get(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.service.get(organizationId, id, request.user);
  }

  @Get('entries/:id/history')
  history(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.service.history(organizationId, id, request.user);
  }

  @Patch('entries/:id')
  update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOperationalLogEntryDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.service.update(organizationId, id, dto, request.user);
  }

  @Post('entries/:id/report-association')
  associateReport(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssociateOperationalLogReportDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.service.associateReport(organizationId, id, dto, request.user);
  }
}
