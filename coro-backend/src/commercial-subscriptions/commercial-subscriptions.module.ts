import { Module } from '@nestjs/common';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CommercialSubscriptionsController } from './commercial-subscriptions.controller';
import { CommercialSubscriptionsService } from './commercial-subscriptions.service';

@Module({
  imports: [PrismaModule, AdminAuditModule],
  controllers: [CommercialSubscriptionsController],
  providers: [CommercialSubscriptionsService],
  exports: [CommercialSubscriptionsService],
})
export class CommercialSubscriptionsModule {}
