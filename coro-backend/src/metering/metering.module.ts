import { Module } from '@nestjs/common';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MeteringController } from './metering.controller';
import { MeteringService } from './metering.service';

@Module({
  imports: [PrismaModule, AdminAuditModule],
  controllers: [MeteringController],
  providers: [MeteringService],
  exports: [MeteringService],
})
export class MeteringModule {}
