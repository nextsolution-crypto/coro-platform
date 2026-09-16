import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExerciseReportsController } from './exercise-reports.controller';
import { ExerciseReportsService } from './exercise-reports.service';

@Module({
  imports: [PrismaModule],
  controllers: [ExerciseReportsController],
  providers: [ExerciseReportsService],
  exports: [ExerciseReportsService],
})
export class ExerciseReportsModule {}
