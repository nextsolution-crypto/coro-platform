import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SpatialModule } from '../spatial/spatial.module';
import { StorageModule } from '../storage/storage.module';
import { DisplayPlanPublicationController } from './display-plan-publication.controller';
import { DisplayPlanPublicationService } from './display-plan-publication.service';
import { DisplayPlanRendererService } from './display-plan-renderer.service';

@Module({
  imports: [PrismaModule, SpatialModule, StorageModule],
  controllers: [DisplayPlanPublicationController],
  providers: [DisplayPlanPublicationService, DisplayPlanRendererService],
  exports: [DisplayPlanPublicationService],
})
export class DisplayPlansModule {}
