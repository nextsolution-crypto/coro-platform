import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OperationalLogAccessService } from './operational-log-access.service';
import { OperationalLogController } from './operational-log.controller';
import { OperationalLogService } from './operational-log.service';
import { CapabilityEntitlementsModule } from '../capability-entitlements/capability-entitlements.module';

@Module({
  imports: [PrismaModule, CapabilityEntitlementsModule],
  controllers: [OperationalLogController],
  providers: [OperationalLogService, OperationalLogAccessService],
  exports: [OperationalLogService],
})
export class OperationalLogModule {}
