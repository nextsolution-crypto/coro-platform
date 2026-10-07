import { Module } from '@nestjs/common';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CommercialContentController } from './commercial-content.controller';
import { CommercialContentService } from './commercial-content.service';

@Module({
  imports: [PrismaModule, AdminAuditModule],
  controllers: [CommercialContentController],
  providers: [CommercialContentService],
  exports: [CommercialContentService],
})
export class CommercialContentModule {}
