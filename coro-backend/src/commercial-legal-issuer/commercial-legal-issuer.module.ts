import { Module } from '@nestjs/common';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CommercialLegalIssuerController } from './commercial-legal-issuer.controller';
import { CommercialLegalIssuerService } from './commercial-legal-issuer.service';

@Module({
  imports: [PrismaModule, AdminAuditModule],
  controllers: [CommercialLegalIssuerController],
  providers: [CommercialLegalIssuerService],
  exports: [CommercialLegalIssuerService],
})
export class CommercialLegalIssuerModule {}
