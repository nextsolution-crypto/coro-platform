import { Body, Controller, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { ClientJwtGuard } from '../client-portal/client-jwt.guard';
import { CreateOperationalReviewDto, UpdateOperationalReviewDto } from './dto/operational-review.dto';
import { OperationalReviewsService, ReviewActor } from './operational-reviews.service';

@Controller('client-portal/operational-reviews')
@UseGuards(ClientJwtGuard)
export class OperationalReviewsController {
  constructor(private readonly service: OperationalReviewsService) {}
  @Post() create(@Body() dto: CreateOperationalReviewDto, @Request() req: { clientUser: ReviewActor }) { return this.service.create(dto, req.clientUser); }
  @Get(':id') get(@Param('id') id: string, @Request() req: { clientUser: ReviewActor }) { return this.service.get(id, req.clientUser); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateOperationalReviewDto, @Request() req: { clientUser: ReviewActor }) { return this.service.update(id, dto, req.clientUser); }
  @Post(':id/submit') submit(@Param('id') id: string, @Request() req: { clientUser: ReviewActor }) { return this.service.submit(id, req.clientUser); }
  @Post(':id/finalize') finalize(@Param('id') id: string, @Request() req: { clientUser: ReviewActor }) { return this.service.finalize(id, req.clientUser); }
}
