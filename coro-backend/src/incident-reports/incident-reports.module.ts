import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IncidentReportAccessService } from './incident-report-access.service';
import { IncidentReportsController } from './incident-reports.controller';
import { IncidentReportsService } from './incident-reports.service';
import { StorageModule } from '../storage/storage.module';
import { IncidentReportWorkflowService } from './incident-report-workflow.service';
import { IncidentReportAttachmentsService } from './incident-report-attachments.service';
import { IncidentReportAttachmentScanner } from './incident-report-attachment-scanner.service';
import { IncidentReportTemplatesService } from './incident-report-templates.service';
import { IncidentReportExportsService } from './incident-report-exports.service';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [IncidentReportsController],
  providers: [
    IncidentReportsService,
    IncidentReportAccessService,
    IncidentReportWorkflowService,
    IncidentReportAttachmentsService,
    IncidentReportAttachmentScanner,
    IncidentReportTemplatesService,
    IncidentReportExportsService,
  ],
  exports: [
    IncidentReportsService,
    IncidentReportWorkflowService,
    IncidentReportAttachmentsService,
    IncidentReportTemplatesService,
    IncidentReportExportsService,
  ],
})
export class IncidentReportsModule {}
