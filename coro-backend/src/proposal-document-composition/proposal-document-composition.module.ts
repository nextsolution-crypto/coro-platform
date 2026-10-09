import { Module } from '@nestjs/common';
import { ProposalDocumentCompositionController } from './proposal-document-composition.controller';
import { ProposalDocumentCompositionService } from './proposal-document-composition.service';

@Module({
  controllers: [ProposalDocumentCompositionController],
  providers: [ProposalDocumentCompositionService],
  exports: [ProposalDocumentCompositionService],
})
export class ProposalDocumentCompositionModule {}
