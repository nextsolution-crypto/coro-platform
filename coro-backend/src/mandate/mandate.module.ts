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

@Module({
  imports: [PrismaModule, ActivityTypesModule, ActivitiesModule],
  controllers: [MandateController, RendementController, PortfolioController, CapacityController],
  providers: [MandateService, MandateServicesService, MandateOperationsPreviewService,
    MandateOperationsApplyService, CapacityService],
  exports: [MandateService, CapacityService],
})
export class MandateModule {}
