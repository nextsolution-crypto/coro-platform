import { Module } from '@nestjs/common';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { CommercialProposalsModule } from '../commercial-proposals/commercial-proposals.module';
import { CommercialSimulatorController } from './commercial-simulator.controller';
import { CommercialSimulatorService } from './commercial-simulator.service';

@Module({
  imports: [AdminAuditModule, CommercialProposalsModule],
  controllers: [CommercialSimulatorController],
  providers: [CommercialSimulatorService],
  exports: [CommercialSimulatorService],
})
export class CommercialSimulatorModule {}
