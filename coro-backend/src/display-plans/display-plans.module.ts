import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SpatialModule } from '../spatial/spatial.module';
import { StorageModule } from '../storage/storage.module';
import { DisplayPlanPublicationController } from './display-plan-publication.controller';
import { DisplayPlanPublicationService } from './display-plan-publication.service';
import { DisplayPlanRendererService } from './display-plan-renderer.service';
import { DisplayPdfRasterizerBridgeService } from './display-pdf-rasterizer-bridge.service';
import { DisplayPdfRenderJobService } from './display-pdf-render-job.service';
import { DisplayPdfMaintenanceService } from './display-pdf-maintenance.service';
import { DisplayPlanProfileService } from './display-plan-profile.service';
import { DisplayManagerController } from './display-manager.controller';
import { DisplayManagerService } from './display-manager.service';

@Module({
  imports: [PrismaModule, SpatialModule, StorageModule],
  controllers: [DisplayPlanPublicationController, DisplayManagerController],
  providers: [
    DisplayPlanPublicationService,
    DisplayPlanRendererService,
    DisplayPdfRasterizerBridgeService,
    DisplayPdfRenderJobService,
    DisplayPdfMaintenanceService,
    DisplayPlanProfileService,
    DisplayManagerService,
  ],
  exports: [
    DisplayPlanPublicationService,
    DisplayPdfRenderJobService,
    DisplayPdfMaintenanceService,
    DisplayPlanProfileService,
  ],
})
export class DisplayPlansModule {}
