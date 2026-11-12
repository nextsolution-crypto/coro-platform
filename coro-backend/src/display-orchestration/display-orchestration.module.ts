import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SpatialModule } from '../spatial/spatial.module';
import { DisplayDeviceModule } from '../display-device/display-device.module';
import { DisplayOrchestrationController } from './display-orchestration.controller';
import { DisplayOrchestrationService } from './display-orchestration.service';

@Module({
  imports: [PrismaModule, SpatialModule, DisplayDeviceModule],
  controllers: [DisplayOrchestrationController],
  providers: [DisplayOrchestrationService],
  exports: [DisplayOrchestrationService],
})
export class DisplayOrchestrationModule {}
