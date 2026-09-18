import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateExerciseReportDto } from './dto/create-exercise-report.dto';
import { UpdateExerciseReportDto } from './dto/update-exercise-report.dto';
import { ExerciseReportsService } from './exercise-reports.service';
import { AdviserActor } from '../auth/project-access';
import { CompatibleExerciseSourcesDto } from './dto/compatible-exercise-sources.dto';

interface AuthenticatedRequest {
  user: AdviserActor;
}

@Controller()
@UseGuards(AuthGuard('jwt'))
export class ExerciseReportsController {
  constructor(private readonly service: ExerciseReportsService) {}

  @Post('activities/:activityId/exercise-report')
  create(
    @Param('activityId') activityId: string,
    @Body() dto: CreateExerciseReportDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.createFromActivity(activityId, dto, req.user);
  }

  @Get('exercise-reports/:id')
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
}
