import { Module } from '@nestjs/common';
import { MandateController } from './mandate.controller';
import { MandateService } from './mandate.service';
import { RendementController } from './rendement.controller';
import { PortfolioController } from './portfolio.controller';
import { CapacityController } from './capacity.controller';
import { CapacityService } from './capacity.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ActivityTypesModule } from '../activity-types/activity-types.module';
import { MandateServicesService } from './mandate-services.service';
import { MandateOperationsPreviewService } from './mandate-operations-preview.service';
import { MandateOperationsApplyService } from './mandate-operations-apply.service';
import { ActivitiesModule } from '../activities/activities.module';
import { AdvisorCostRatesController } from './advisor-cost-rates.controller';
import { AdvisorCostRatesService } from './advisor-cost-rates.service';
import { RendementFinancialService } from './rendement-financial.service';

@Module({
  imports: [PrismaModule, ActivityTypesModule, ActivitiesModule],
  controllers: [
    MandateController,
    RendementController,
    AdvisorCostRatesController,
    PortfolioController,
    CapacityController,
  ],
  providers: [
    MandateService,
    MandateServicesService,
    MandateOperationsPreviewService,
    MandateOperationsApplyService,
    CapacityService,
    AdvisorCostRatesService,
    RendementFinancialService,
  ],
  exports: [MandateService, CapacityService],
})
export class MandateModule {}
