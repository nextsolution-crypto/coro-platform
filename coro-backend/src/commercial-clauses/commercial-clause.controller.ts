import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';
import {
  ClauseLegalReviewDto,
  ClauseReasonDto,
  UpdateCommercialClauseDraftDto,
} from './commercial-clause.dto';
import { CommercialClauseService } from './commercial-clause.service';

type AuthenticatedRequest = { user: { userId: string } };

@Controller('admin/v1/commercial/clauses')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class CommercialClauseController {
  constructor(private readonly service: CommercialClauseService) {}

  @Get() list() {
    return this.service.list();
  }
  @Get('approved-projection') approvedProjection() {
    return this.service.approvedProjection();
  }
  @Post('draft-catalog') createCatalog(@Request() req: AuthenticatedRequest) {
    return this.service.createDraftCatalog(req.user);
  }
  @Patch('versions/:id') update(
    @Param('id') id: string,
    @Body() dto: UpdateCommercialClauseDraftDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.updateDraft(id, dto, req.user);
  }
  @Post(':code/revisions') revise(
    @Param('code') code: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.createRevision(code, req.user);
  }
  @Post('versions/:id/submit') submit(
    @Param('id') id: string,
    @Body() dto: ClauseReasonDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.submit(id, dto, req.user);
  }
  @Post('versions/:id/return-to-draft') returnToDraft(
    @Param('id') id: string,
    @Body() dto: ClauseReasonDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.returnToDraft(id, dto, req.user);
  }
  @Post('versions/:id/legal-review') legalReview(
    @Param('id') id: string,
    @Body() dto: ClauseLegalReviewDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.recordLegalReview(id, dto, req.user);
  }
  @Post('versions/:id/approve') approve(
    @Param('id') id: string,
    @Body() dto: ClauseReasonDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.approve(id, dto, req.user);
  }
  @Post('versions/:id/archive') archive(
    @Param('id') id: string,
    @Body() dto: ClauseReasonDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.archive(id, dto, req.user);
  }
}
