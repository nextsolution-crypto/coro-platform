import { Body, Controller, Delete, Get, Param, Post, Put, Request, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ClientJwtGuard } from '../client-portal/client-jwt.guard';
import { CreateOperationalReviewDto, UpdateOperationalReviewDto } from './dto/operational-review.dto';
import { OperationalReviewsService, ReviewActor } from './operational-reviews.service';
import { ChangeReviewFindingStatusDto, CreateReviewFindingDto, CreateReviewRecommendationDto, DecideReviewRecommendationDto, UpdateReviewFindingDto, UpdateReviewRecommendationDto } from './dto/review-content.dto';
import { CorrectiveActionsService } from '../occupancy/corrective-actions.service';
import { CreateCorrectiveActionDto } from '../occupancy/dto/corrective-action.dto';
import { OperationalReviewReportService } from './operational-review-report.service';

@Controller('client-portal/operational-reviews')
@UseGuards(ClientJwtGuard)
export class OperationalReviewsController {
  constructor(private readonly service: OperationalReviewsService, private readonly correctiveActions: CorrectiveActionsService, private readonly reports: OperationalReviewReportService) {}
  @Post() create(@Body() dto: CreateOperationalReviewDto, @Request() req: { clientUser: ReviewActor }) { return this.service.create(dto, req.clientUser); }
  @Get('population-events/:eventId') getForPopulationEvent(@Param('eventId') eventId: string, @Request() req: { clientUser: ReviewActor }) { return this.service.getForPopulationEvent(eventId, req.clientUser); }
  @Get(':id') get(@Param('id') id: string, @Request() req: { clientUser: ReviewActor }) { return this.service.get(id, req.clientUser); }
  @Post(':id/report') generateReport(@Param('id') id: string, @Request() req: { clientUser: ReviewActor }) { return this.reports.generate(id, req.clientUser); }
  @Get(':id/report') getReport(@Param('id') id: string, @Request() req: { clientUser: ReviewActor }) { return this.reports.get(id, req.clientUser); }
  @Get(':id/report/download') async downloadReport(@Param('id') id: string, @Request() req: { clientUser: ReviewActor }, @Res() res: Response) {
    const report = await this.reports.download(id, req.clientUser);
    res.set({
      'Content-Type': 'application/pdf', 'Content-Length': String(report.bytes.length),
      'Content-Disposition': `attachment; filename="${report.filename}"; filename*=UTF-8''${encodeURIComponent(report.filename)}`,
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
      'Access-Control-Expose-Headers': 'Content-Disposition',
    });
    return res.send(report.bytes);
  }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateOperationalReviewDto, @Request() req: { clientUser: ReviewActor }) { return this.service.update(id, dto, req.clientUser); }
  @Post(':id/submit') submit(@Param('id') id: string, @Request() req: { clientUser: ReviewActor }) { return this.service.submit(id, req.clientUser); }
  @Post(':id/finalize') finalize(@Param('id') id: string, @Request() req: { clientUser: ReviewActor }) { return this.service.finalize(id, req.clientUser); }
  @Post(':id/findings') createFinding(@Param('id') id: string, @Body() dto: CreateReviewFindingDto, @Request() req: { clientUser: ReviewActor }) { return this.service.createFinding(id, dto, req.clientUser); }
  @Put(':id/findings/:findingId') updateFinding(@Param('id') id: string, @Param('findingId') findingId: string, @Body() dto: UpdateReviewFindingDto, @Request() req: { clientUser: ReviewActor }) { return this.service.updateFinding(id, findingId, dto, req.clientUser); }
  @Post(':id/findings/:findingId/status') changeFindingStatus(@Param('id') id: string, @Param('findingId') findingId: string, @Body() dto: ChangeReviewFindingStatusDto, @Request() req: { clientUser: ReviewActor }) { return this.service.changeFindingStatus(id, findingId, dto, req.clientUser); }
  @Delete(':id/findings/:findingId') deleteFinding(@Param('id') id: string, @Param('findingId') findingId: string, @Request() req: { clientUser: ReviewActor }) { return this.service.deleteFinding(id, findingId, req.clientUser); }
  @Post(':id/findings/:findingId/recommendations') createRecommendation(@Param('id') id: string, @Param('findingId') findingId: string, @Body() dto: CreateReviewRecommendationDto, @Request() req: { clientUser: ReviewActor }) { return this.service.createRecommendation(id, findingId, dto, req.clientUser); }
  @Put(':id/recommendations/:recommendationId') updateRecommendation(@Param('id') id: string, @Param('recommendationId') recommendationId: string, @Body() dto: UpdateReviewRecommendationDto, @Request() req: { clientUser: ReviewActor }) { return this.service.updateRecommendation(id, recommendationId, dto, req.clientUser); }
  @Post(':id/recommendations/:recommendationId/decision') decideRecommendation(@Param('id') id: string, @Param('recommendationId') recommendationId: string, @Body() dto: DecideReviewRecommendationDto, @Request() req: { clientUser: ReviewActor }) { return this.service.decideRecommendation(id, recommendationId, dto, req.clientUser); }
  @Delete(':id/recommendations/:recommendationId') deleteRecommendation(@Param('id') id: string, @Param('recommendationId') recommendationId: string, @Request() req: { clientUser: ReviewActor }) { return this.service.deleteRecommendation(id, recommendationId, req.clientUser); }
  @Post(':id/recommendations/:recommendationId/corrective-actions') createCorrectiveAction(@Param('id') id: string, @Param('recommendationId') recommendationId: string, @Body() dto: CreateCorrectiveActionDto, @Request() req: { clientUser: ReviewActor }) { return this.correctiveActions.createFromRecommendation(id, recommendationId, dto, req.clientUser); }
}
