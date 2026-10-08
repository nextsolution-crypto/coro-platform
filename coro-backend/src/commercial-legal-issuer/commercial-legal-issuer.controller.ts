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
  CaptureLegalIssuerSnapshotDto,
  LegalIssuerReasonDto,
  UpdateLegalIssuerDraftDto,
} from './commercial-legal-issuer.dto';
import { CommercialLegalIssuerService } from './commercial-legal-issuer.service';

type AuthenticatedRequest = { user: { userId: string } };

@Controller('admin/v1/commercial/legal-issuers')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class CommercialLegalIssuerController {
  constructor(private readonly service: CommercialLegalIssuerService) {}
  @Get() list() {
    return this.service.list();
  }
  @Post('coro-draft') createCoroDraft(@Request() req: AuthenticatedRequest) {
    return this.service.createCoroDraft(req.user);
  }
  @Patch('versions/:id') update(
    @Param('id') id: string,
    @Body() dto: UpdateLegalIssuerDraftDto,
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
  @Post('versions/:id/verify') verify(
    @Param('id') id: string,
    @Body() dto: LegalIssuerReasonDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.verify(id, dto, req.user);
  }
  @Post('versions/:id/archive') archive(
    @Param('id') id: string,
    @Body() dto: LegalIssuerReasonDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.archive(id, dto, req.user);
  }
  @Post('proposal-revisions/:proposalRevisionId/snapshot') snapshot(
    @Param('proposalRevisionId') proposalRevisionId: string,
    @Body() dto: CaptureLegalIssuerSnapshotDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.captureSnapshot(
      proposalRevisionId,
      dto.issuerCode,
      req.user,
    );
  }
}
