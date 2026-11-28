import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  PublicTrainingQuestionnairesController,
  TrainingQuestionnairesController,
} from './training-questionnaires.controller';
import { TrainingQuestionnairesService } from './training-questionnaires.service';

@Module({
  imports: [PrismaModule],
  controllers: [TrainingQuestionnairesController, PublicTrainingQuestionnairesController],
  providers: [TrainingQuestionnairesService],
  exports: [TrainingQuestionnairesService],
})
export class TrainingQuestionnairesModule {}
