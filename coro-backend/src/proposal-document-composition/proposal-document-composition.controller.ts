import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';
import {
  ComposeProposalDocumentDto,
  GenerateGovernedProposalPdfDto,
} from './proposal-document-composition.dto';
import { ProposalDocumentCompositionService } from './proposal-document-composition.service';
import { GovernedProposalPdfService } from './governed-proposal-pdf.service';

type RequestWithUser = { user: { userId: string } };

@Controller('admin/v1/commercial/proposals')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class ProposalDocumentCompositionController {
  constructor(
    private readonly composition: ProposalDocumentCompositionService,
    private readonly pdf: GovernedProposalPdfService,
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

  @Post(
    ':proposalId/revisions/:revisionId/document-compositions/:snapshotId/generate-pdf-v2',
  )
  generatePdfV2(
    @Param('proposalId') proposalId: string,
    @Param('revisionId') revisionId: string,
    @Param('snapshotId') snapshotId: string,
    @Body() dto: GenerateGovernedProposalPdfDto,
    @Request() request: RequestWithUser,
  ) {
    return this.pdf.generate(
      proposalId,
      revisionId,
      snapshotId,
      dto.idempotencyKey,
      request.user,
    );
  }

  @Get(
    ':proposalId/revisions/:revisionId/document-compositions/:snapshotId/documents/:documentId/download',
  )
  async downloadPdfV2(
    @Param('proposalId') proposalId: string,
    @Param('revisionId') revisionId: string,
    @Param('snapshotId') snapshotId: string,
    @Param('documentId') documentId: string,
  ) {
    const document = await this.pdf.download(
      proposalId,
      revisionId,
      snapshotId,
      documentId,
    );
    return new StreamableFile(document.buffer, {
      type: document.mimeType,
      disposition: `attachment; filename="${document.fileName.replace(/["\r\n]/g, '_')}"`,
    });
  }
}
