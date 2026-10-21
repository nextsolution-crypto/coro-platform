import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExerciseReportsController } from './exercise-reports.controller';
import { ExerciseReportsService } from './exercise-reports.service';
import { ExerciseReportGovernanceService } from './exercise-report-governance.service';
import { StorageModule } from '../storage/storage.module';
import { ExerciseReportAccessService } from './exercise-report-access.service';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [ExerciseReportsController],
  providers: [
    ExerciseReportsService,
    ExerciseReportGovernanceService,
    ExerciseReportAccessService,
  ],
  exports: [ExerciseReportsService],
})
export class ExerciseReportsModule {}
