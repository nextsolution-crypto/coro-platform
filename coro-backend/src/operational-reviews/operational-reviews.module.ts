import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { OperationalReviewsController } from './operational-reviews.controller';
import { OperationalReviewsService } from './operational-reviews.service';
import { CorrectiveActionsService } from '../occupancy/corrective-actions.service';
import { OperationalReviewReportService } from './operational-review-report.service';
import { StorageModule } from '../storage/storage.module';
import { OperationalReviewReportsAdminController } from './operational-review-reports-admin.controller';
import { CorrectiveActionTrackingReportService } from './corrective-action-tracking-report.service';
import { CorrectiveActionTrackingPdfService } from './corrective-action-tracking-pdf.service';

@Module({ imports: [PrismaModule, StorageModule, JwtModule.register({ secret: process.env.JWT_SECRET || 'coro-secret' })], controllers: [OperationalReviewsController, OperationalReviewReportsAdminController], providers: [OperationalReviewsService, CorrectiveActionsService, OperationalReviewReportService, CorrectiveActionTrackingReportService, CorrectiveActionTrackingPdfService], exports: [OperationalReviewsService] })
export class OperationalReviewsModule {}
