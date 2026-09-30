import { Module } from '@nestjs/common';
import { CapabilityEntitlementsModule } from '../capability-entitlements/capability-entitlements.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CapabilityObservationModule } from './capability-observation.module';
import { CommercialReconciliationService } from './commercial-reconciliation.service';
import { ControlCenterController } from './control-center.controller';
import { ControlCenterService } from './control-center.service';
import { OperationalObservationModule } from '../operational-observation/operational-observation.module';

@Module({
  imports: [
    PrismaModule,
    CapabilityEntitlementsModule,
    CapabilityObservationModule,
    OperationalObservationModule,
  ],
  controllers: [ControlCenterController],
  providers: [ControlCenterService, CommercialReconciliationService],
  exports: [CapabilityObservationModule, CommercialReconciliationService],
})
export class ControlCenterModule {}
