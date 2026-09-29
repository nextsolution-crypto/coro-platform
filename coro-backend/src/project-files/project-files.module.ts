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
  controllers: [ProjectFilesController, ProjectFilesClientController],
  providers: [ProjectFilesService],
  exports: [ProjectFilesService],
})
export class ProjectFilesModule {}
