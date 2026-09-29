import { Module } from '@nestjs/common';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CommercialCatalogController } from './commercial-catalog.controller';
import { CommercialCatalogService } from './commercial-catalog.service';

@Module({
  imports: [PrismaModule, AdminAuditModule],
  controllers: [CommercialCatalogController],
  providers: [CommercialCatalogService],
})
export class CommercialCatalogModule {}
