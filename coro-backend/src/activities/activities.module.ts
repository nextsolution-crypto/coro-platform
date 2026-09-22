import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ActivityTypesModule } from '../activity-types/activity-types.module';

@Module({
  imports: [PrismaModule, ActivityTypesModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
