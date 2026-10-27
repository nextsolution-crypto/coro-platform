import { BuildingDocumentsService } from '../building-documents/building-documents.service';
import {
  BuildingDocumentsController,
  BuildingDocumentsClientController,
} from '../building-documents/building-documents.controller';
import { Module } from '@nestjs/common';
import { ProjectFilesService } from './project-files.service';
import { ProjectFilesController } from './project-files.controller';
import { ProjectFilesClientController } from './project-files-client.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MulterModule } from '@nestjs/platform-express';
import { JwtModule } from '@nestjs/jwt';
import { requireJwtSecret } from '../auth/auth-security.config';
import { OfflineDocumentsService } from './offline-documents.service';
import { ProjectFileExpiryRemindersService } from './project-file-expiry-reminders.service';
import { ProjectDocumentMutationGuard } from './project-document-mutation.guard';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    NotificationsModule,
    MulterModule.register({ limits: { fileSize: 50 * 1024 * 1024 } }),
    JwtModule.register({
      secret: requireJwtSecret(),
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    ProjectFilesController,
    ProjectFilesClientController,
    BuildingDocumentsController,
    BuildingDocumentsClientController,
  ],
  providers: [
    ProjectFilesService,
    BuildingDocumentsService,
    OfflineDocumentsService,
    ProjectFileExpiryRemindersService,
    ProjectDocumentMutationGuard,
  ],
  exports: [ProjectFilesService],
})
export class ProjectFilesModule {}
