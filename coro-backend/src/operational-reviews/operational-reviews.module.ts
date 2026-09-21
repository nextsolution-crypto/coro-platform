import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { OperationalReviewsController } from './operational-reviews.controller';
import { OperationalReviewsService } from './operational-reviews.service';
import { CorrectiveActionsService } from '../occupancy/corrective-actions.service';
import { OperationalReviewReportService } from './operational-review-report.service';
import { StorageModule } from '../storage/storage.module';

@Module({ imports: [PrismaModule, StorageModule, JwtModule.register({ secret: process.env.JWT_SECRET || 'coro-secret' })], controllers: [OperationalReviewsController], providers: [OperationalReviewsService, CorrectiveActionsService, OperationalReviewReportService], exports: [OperationalReviewsService] })
export class OperationalReviewsModule {}
