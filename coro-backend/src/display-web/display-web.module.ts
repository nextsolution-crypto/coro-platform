import { Module } from '@nestjs/common';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SpatialModule } from '../spatial/spatial.module';
import { StorageModule } from '../storage/storage.module';
import {
  DisplayWebAdministrationController,
  DisplayWebPublicController,
} from './display-web.controller';
import { DisplayWebService } from './display-web.service';

@Module({
  imports: [PrismaModule, SpatialModule, StorageModule, AdminAuditModule],
  controllers: [DisplayWebPublicController, DisplayWebAdministrationController],
  providers: [DisplayWebService],
})
export class DisplayWebModule {}
