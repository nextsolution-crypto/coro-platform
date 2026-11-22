import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SpatialModule } from '../spatial/spatial.module';
import { DisplayDeviceModule } from '../display-device/display-device.module';
import { DisplayOrchestrationController } from './display-orchestration.controller';
import { DisplayOrchestrationService } from './display-orchestration.service';
import { DisplayIncidentBridgeService } from './display-incident-bridge.service';
import { DisplayHeartbeatWatchService } from './display-heartbeat-watch.service';
import { EmailService } from '../client-portal/email.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, SpatialModule, DisplayDeviceModule, NotificationsModule],
  controllers: [DisplayOrchestrationController],
  providers: [
    DisplayOrchestrationService,
    DisplayIncidentBridgeService,
    DisplayHeartbeatWatchService,
    EmailService,
  ],
  exports: [DisplayOrchestrationService],
})
export class DisplayOrchestrationModule {}
