import { Module } from '@nestjs/common';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { CommercialCatalogModule } from '../commercial-catalog/commercial-catalog.module';
import { CommercialSimulatorModule } from '../commercial-simulator/commercial-simulator.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CommercialConfigurationController } from './commercial-configuration.controller';
import { CommercialConfigurationService } from './commercial-configuration.service';
@Module({
  imports: [
    PrismaModule,
    AdminAuditModule,
    CommercialCatalogModule,
    CommercialSimulatorModule,
  ],
  controllers: [CommercialConfigurationController],
  providers: [CommercialConfigurationService],
  exports: [CommercialConfigurationService],
})
export class CommercialConfigurationModule {}
