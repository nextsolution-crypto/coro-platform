import { Module } from '@nestjs/common';
import { ProposalDocumentCompositionController } from './proposal-document-composition.controller';
import { ProposalDocumentCompositionService } from './proposal-document-composition.service';
import { StorageModule } from '../storage/storage.module';
import { GovernedProposalPdfService } from './governed-proposal-pdf.service';

@Module({
  imports: [StorageModule],
  controllers: [ProposalDocumentCompositionController],
  providers: [ProposalDocumentCompositionService, GovernedProposalPdfService],
  exports: [ProposalDocumentCompositionService],
})
export class ProposalDocumentCompositionModule {}
