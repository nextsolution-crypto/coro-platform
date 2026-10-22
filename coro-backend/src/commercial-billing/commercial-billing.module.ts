import { Module } from '@nestjs/common';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CommercialBillingController } from './commercial-billing.controller';
import { CommercialBillingService } from './commercial-billing.service';

@Module({ imports: [PrismaModule, AdminAuditModule], controllers: [CommercialBillingController], providers: [CommercialBillingService], exports: [CommercialBillingService] })
export class CommercialBillingModule {}
