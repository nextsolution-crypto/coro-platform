import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { LegacyPublicObjectsService } from './legacy-public-objects.service';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';

@Module({
  imports: [
    MulterModule.register({
      storage: multer.memoryStorage(),
    }),
  ],
  controllers: [StorageController],
  providers: [StorageService, LegacyPublicObjectsService],
  exports: [StorageService],
})
export class StorageModule {}