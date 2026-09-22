import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { WorkSchedulesController } from './work-schedules.controller';
import { WorkSchedulesService } from './work-schedules.service';

@Module({ imports: [PrismaModule, SchedulingModule], controllers: [WorkSchedulesController], providers: [WorkSchedulesService] })
export class WorkSchedulesModule {}
