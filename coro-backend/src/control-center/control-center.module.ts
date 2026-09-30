import { Module } from '@nestjs/common';
import { CapabilityEntitlementsModule } from '../capability-entitlements/capability-entitlements.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CapabilityObservationService } from './capability-observation.service';
import { CommercialReconciliationService } from './commercial-reconciliation.service';
import { ControlCenterController } from './control-center.controller';
import { ControlCenterService } from './control-center.service';

@Module({
  imports: [PrismaModule, CapabilityEntitlementsModule],
  controllers: [ControlCenterController],
  providers: [
    ControlCenterService,
    CapabilityObservationService,
    CommercialReconciliationService,
  ],
  exports: [CapabilityObservationService, CommercialReconciliationService],
})
export class ControlCenterModule {}
