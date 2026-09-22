import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { MandateModule } from '../mandate/mandate.module';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';

@Module({
  imports: [PrismaModule, SchedulingModule, MandateModule],
  controllers: [PlanningController],
  providers: [PlanningService],
})
export class PlanningModule {}
