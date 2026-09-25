import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { MandateModule } from '../mandate/mandate.module';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { PlanningActionsService } from './planning-actions.service';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  imports: [PrismaModule, SchedulingModule, MandateModule, ActivitiesModule],
  controllers: [PlanningController],
  providers: [PlanningService, PlanningActionsService],
})
export class PlanningModule {}
