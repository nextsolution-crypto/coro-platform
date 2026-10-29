import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { AuditModule } from '../audit/audit.module';
import { DocumentPdfExportService } from './document-pdf-export.service';

@Module({
  imports: [PrismaModule, StorageModule, AuditModule],
  controllers: [ExportController],
  providers: [ExportService, DocumentPdfExportService],
  exports: [ExportService],
})
export class ExportModule {}
