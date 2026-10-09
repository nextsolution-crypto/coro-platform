import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';
import { ComposeProposalDocumentDto } from './proposal-document-composition.dto';
import { ProposalDocumentCompositionService } from './proposal-document-composition.service';

type RequestWithUser = { user: { userId: string } };

@Controller('admin/v1/commercial/proposals')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class ProposalDocumentCompositionController {
  constructor(
    private readonly composition: ProposalDocumentCompositionService,
  ) {}

  @Post(':proposalId/revisions/:revisionId/document-compositions')
  compose(
    @Param('proposalId') proposalId: string,
    @Param('revisionId') revisionId: string,
    @Body() dto: ComposeProposalDocumentDto,
    @Request() request: RequestWithUser,
  ) {
    return this.composition.composeInternalDraft(
      proposalId,
      revisionId,
      dto,
      request.user,
    );
  }

  @Get(':proposalId/revisions/:revisionId/document-compositions')
  history(
    @Param('proposalId') proposalId: string,
    @Param('revisionId') revisionId: string,
  ) {
    return this.composition.history(proposalId, revisionId);
  }

  @Get(':proposalId/revisions/:revisionId/document-compositions/:snapshotId')
  metadata(
    @Param('proposalId') proposalId: string,
    @Param('revisionId') revisionId: string,
    @Param('snapshotId') snapshotId: string,
  ) {
    return this.composition.metadata(proposalId, revisionId, snapshotId);
  }
}
