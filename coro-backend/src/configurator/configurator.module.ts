import { Module } from '@nestjs/common';
import { ConfiguratorController } from './configurator.controller';
import { ConfiguratorService } from './configurator.service';
import { RulesEngineService } from './rules-engine.service';

@Module({
  controllers: [ConfiguratorController],
  providers: [ConfiguratorService, RulesEngineService],
  exports: [ConfiguratorService],
})
export class ConfiguratorModule {}