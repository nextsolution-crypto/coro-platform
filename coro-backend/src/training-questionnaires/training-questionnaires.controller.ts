import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import type { AdviserActor } from '../auth/project-access';
import { TrainingQuestionnairesService } from './training-questionnaires.service';

@Controller()
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
export class TrainingQuestionnairesController {
  constructor(private readonly service: TrainingQuestionnairesService) {}

  @Get('training-questionnaires')
  list(@Request() req: { user: AdviserActor }) {
    return this.service.list(req.user);
  }

  @Put('training-questionnaires/:code')
  save(@Param('code') code: string, @Body() body: Record<string, unknown>, @Request() req: { user: AdviserActor }) {
    return this.service.save(req.user, code, body);
  }

  @Delete('training-questionnaires/:code')
  reset(@Param('code') code: string, @Request() req: { user: AdviserActor }) {
    return this.service.reset(req.user, code);
  }

  @Get('activities/:activityId/questionnaire')
  getForActivity(@Param('activityId') activityId: string, @Request() req: { user: AdviserActor }) {
    return this.service.getForActivity(req.user, activityId);
  }

  @Post('activities/:activityId/questionnaire/open')
  open(@Param('activityId') activityId: string, @Request() req: { user: AdviserActor }) {
    return this.service.open(req.user, activityId);
  }

  @Post('activities/:activityId/questionnaire/close')
  close(@Param('activityId') activityId: string, @Request() req: { user: AdviserActor }) {
    return this.service.close(req.user, activityId);
  }
}

/** Accès des participants par code QR : aucune session, jeton aléatoire, débit limité. */
@Controller('public/questionnaires')
@Throttle({ short: { ttl: 60_000, limit: 60 } })
export class PublicTrainingQuestionnairesController {
  constructor(private readonly service: TrainingQuestionnairesService) {}

  @Get(':token')
  get(@Param('token') token: string) {
    return this.service.publicGet(token);
  }

  @Post(':token/responses')
  submit(@Param('token') token: string, @Body() body: Record<string, unknown>) {
    return this.service.publicSubmit(token, body);
  }
}
