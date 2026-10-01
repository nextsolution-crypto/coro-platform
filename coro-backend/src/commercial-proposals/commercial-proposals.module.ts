import { Module } from '@nestjs/common';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { StorageModule } from '../storage/storage.module';
import {
  CommercialProposalsController,
  CommercialProspectsController,
} from './commercial-proposals.controller';
import { CommercialProposalsService } from './commercial-proposals.service';
import { ProposalPdfService } from './proposal-pdf.service';
import { ProposalPricingEngine } from './proposal-pricing-engine';
import {
  CommercialRuleRegistry,
  PRODUCTION_COMMERCIAL_RULE_REGISTRY,
} from './commercial-rule-registry';
@Module({
  imports: [AdminAuditModule, StorageModule],
  controllers: [CommercialProposalsController, CommercialProspectsController],
  providers: [
    CommercialProposalsService,
    ProposalPdfService,
    ProposalPricingEngine,
    {
      provide: CommercialRuleRegistry,
      useValue: PRODUCTION_COMMERCIAL_RULE_REGISTRY,
    },
  ],
  exports: [
    CommercialProposalsService,
    ProposalPricingEngine,
    CommercialRuleRegistry,
  ],
})
export class CommercialProposalsModule {}
