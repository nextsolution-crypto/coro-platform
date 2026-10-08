import { Module } from '@nestjs/common';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CommercialClauseController } from './commercial-clause.controller';
import { CommercialClauseService } from './commercial-clause.service';

@Module({
  imports: [PrismaModule, AdminAuditModule],
  controllers: [CommercialClauseController],
  providers: [CommercialClauseService],
  exports: [CommercialClauseService],
})
export class CommercialClauseModule {}
