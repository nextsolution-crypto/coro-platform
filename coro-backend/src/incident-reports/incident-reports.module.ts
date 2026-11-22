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
import { CapabilityEntitlementsModule } from '../capability-entitlements/capability-entitlements.module';
import { IncidentReportImportController } from './incident-report-import.controller';
import { IncidentReportImportService } from './incident-report-import.service';
import { IncidentReportImportMappingService } from './incident-report-import-mapping.service';
import { IncidentReportImportExecutionService } from './incident-report-import-execution.service';
import { IncidentReportHistoricalService } from './incident-report-historical.service';

import { IncidentReportAttachmentScanWorker } from './incident-report-attachment-scan-worker.service';
@Module({
  imports: [PrismaModule, StorageModule, CapabilityEntitlementsModule],
  controllers: [IncidentReportsController, IncidentReportImportController],
  providers: [
    IncidentReportsService,
    IncidentReportAccessService,
    IncidentReportWorkflowService,
    IncidentReportAttachmentsService,
    IncidentReportAttachmentScanner,
    IncidentReportAttachmentScanWorker,
    IncidentReportTemplatesService,
    IncidentReportExportsService,
    IncidentReportImportService,
    IncidentReportImportMappingService,
    IncidentReportImportExecutionService,
    IncidentReportHistoricalService,
  ],
  exports: [
    IncidentReportsService,
    IncidentReportWorkflowService,
    IncidentReportAttachmentsService,
    IncidentReportTemplatesService,
    IncidentReportExportsService,
    IncidentReportHistoricalService,
  ],
})
export class IncidentReportsModule {}
