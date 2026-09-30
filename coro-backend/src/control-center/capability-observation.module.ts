import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CapabilityObservationService } from './capability-observation.service';

@Module({
  imports: [PrismaModule],
  providers: [CapabilityObservationService],
  exports: [CapabilityObservationService],
})
export class CapabilityObservationModule {}
