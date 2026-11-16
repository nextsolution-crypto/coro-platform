import { Module } from '@nestjs/common';
import { PilotScenariosController } from './pilot-scenarios.controller';
import { PilotScenariosService } from './pilot-scenarios.service';
import { TenantPilotScenariosController } from './tenant-pilot-scenarios.controller';

@Module({
  controllers: [PilotScenariosController, TenantPilotScenariosController],
  providers: [PilotScenariosService],
})
export class PilotScenariosModule {}
