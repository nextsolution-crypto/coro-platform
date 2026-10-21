import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { CreateExerciseReportDto } from './dto/create-exercise-report.dto';
import { UpdateExerciseReportDto } from './dto/update-exercise-report.dto';
import { ExerciseReportsService } from './exercise-reports.service';
import { AdviserActor } from '../auth/project-access';
import { CompatibleExerciseSourcesDto } from './dto/compatible-exercise-sources.dto';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import { EvidenceReadAccess } from '../auth/organization-access.decorator';
import { ExerciseReportGovernanceService } from './exercise-report-governance.service';
import {
  ExerciseReportPortfolioQueryDto,
  ExerciseReportTransitionDto,
  PublishExerciseReportTemplateDto,
} from './dto/exercise-report-transition.dto';

interface AuthenticatedRequest {
  user: AdviserActor;
}

@Controller()
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
export class ExerciseReportsController {
  constructor(
    private readonly service: ExerciseReportsService,
    private readonly governance: ExerciseReportGovernanceService,
  ) {}

  @Get('exercise-reports/portfolio')
  portfolio(
    @Query() query: ExerciseReportPortfolioQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.governance.portfolio(query, req.user);
  }

  @Get('exercise-report-templates')
  templates(@Request() req: AuthenticatedRequest) {
    return this.governance.templates(req.user);
  }

  @Post('exercise-report-templates/publish')
  publishTemplate(
    @Body() dto: PublishExerciseReportTemplateDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.governance.publishTemplate(dto, req.user);
  }

  @Post('activities/:activityId/exercise-report')
  create(
    @Param('activityId') activityId: string,
    @Body() dto: CreateExerciseReportDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.createFromActivity(activityId, dto, req.user);
  }

  @Get('exercise-reports/:id')
  @EvidenceReadAccess()
  get(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.getDraft(id, req.user);
  }

  @Get('activities/:activityId/exercise-report-sources')
  getCompatibleSources(
    @Param('activityId') activityId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<CompatibleExerciseSourcesDto> {
    return this.service.getCompatibleSources(activityId, req.user);
  }

  @Put('exercise-reports/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExerciseReportDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.updateDraft(id, dto, req.user);
  }

  @Post('exercise-reports/:id/submit-review')
  submitReview(
    @Param('id') id: string,
    @Body() dto: ExerciseReportTransitionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.governance.submitReview(id, dto, req.user);
  }

  @Post('exercise-reports/:id/review')
  review(
    @Param('id') id: string,
    @Body() dto: ExerciseReportTransitionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.governance.recordReview(id, dto, req.user);
  }

  @Post('exercise-reports/:id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: ExerciseReportTransitionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.governance.reject(id, dto, req.user);
  }

  @Post('exercise-reports/:id/approve')
  approve(
    @Param('id') id: string,
    @Body() dto: ExerciseReportTransitionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.governance.approve(id, dto, req.user);
  }

  @Post('exercise-reports/:id/publish')
  publish(
    @Param('id') id: string,
    @Body() dto: ExerciseReportTransitionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.governance.publish(id, dto, req.user);
  }

  @Post('exercise-reports/:id/revisions')
  revision(
    @Param('id') id: string,
    @Body() dto: ExerciseReportTransitionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.governance.newRevision(id, dto, req.user);
  }

  @Get('exercise-reports/:id/versions')
  versions(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.governance.versions(id, req.user);
  }

  @Get('exercise-reports/:id/versions/:version/download')
  async download(
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const file = await this.governance.download(id, version, req.user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName}"`,
    );
    res.setHeader('X-Content-SHA256', file.sha256);
    res.send(file.bytes);
  }

  @Get('exercise-reports/:id/closure-export')
  async closure(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const archive = await this.governance.closure(id, req.user);
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${archive.fileName}"`,
    );
    res.setHeader('X-Content-SHA256', archive.sha256);
    res.send(archive.bytes);
  }
}
