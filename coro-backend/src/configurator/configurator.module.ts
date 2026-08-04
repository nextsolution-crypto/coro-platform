import { Module } from '@nestjs/common';
import { ConfiguratorController } from './configurator.controller';
import { ConfiguratorService } from './configurator.service';
import { RulesEngineService } from './rules-engine.service';
import { ImportService } from './import.service';

@Module({
  controllers: [ConfiguratorController],
  providers: [ConfiguratorService, RulesEngineService, ImportService],
  exports: [ConfiguratorService, ImportService],
})
export class ConfiguratorModule {}