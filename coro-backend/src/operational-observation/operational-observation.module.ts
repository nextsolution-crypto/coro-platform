import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OperationalStateService } from './operational-state.service';

@Module({
  imports: [PrismaModule],
  providers: [OperationalStateService],
  exports: [OperationalStateService],
})
export class OperationalObservationModule {}
