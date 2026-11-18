import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OperationalShiftsAccessService } from './operational-shifts-access.service';
import { OperationalShiftsController } from './operational-shifts.controller';
import { OperationalShiftsService } from './operational-shifts.service';
import { CapabilityEntitlementsModule } from '../capability-entitlements/capability-entitlements.module';

@Module({
  imports: [PrismaModule, CapabilityEntitlementsModule],
  controllers: [OperationalShiftsController],
  providers: [OperationalShiftsService, OperationalShiftsAccessService],
  exports: [OperationalShiftsService],
})
export class OperationalShiftsModule {}
