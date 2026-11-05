import { Module } from '@nestjs/common';
import { PilotScenariosController } from './pilot-scenarios.controller';
import { PilotScenariosService } from './pilot-scenarios.service';

@Module({
  controllers: [PilotScenariosController],
  providers: [PilotScenariosService],
})
export class PilotScenariosModule {}
