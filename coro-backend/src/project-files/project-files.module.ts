import { Module } from '@nestjs/common';
import { ProjectFilesService } from './project-files.service';
import { ProjectFilesController } from './project-files.controller';
import { ProjectFilesClientController } from './project-files-client.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    MulterModule.register({ limits: { fileSize: 50 * 1024 * 1024 } }),
  ],
  controllers: [ProjectFilesController, ProjectFilesClientController],
  providers: [ProjectFilesService],
  exports: [ProjectFilesService],
})
export class ProjectFilesModule {}