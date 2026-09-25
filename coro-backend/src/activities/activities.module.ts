import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ActivityTypesModule } from '../activity-types/activity-types.module';
import { ActivityTaskListsService } from './activity-task-lists.service';

@Module({
  imports: [PrismaModule, ActivityTypesModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, ActivityTaskListsService],
  exports: [ActivitiesService, ActivityTaskListsService],
})
export class ActivitiesModule {}
