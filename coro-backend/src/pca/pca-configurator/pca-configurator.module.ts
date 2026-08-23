import { Module } from '@nestjs/common';
import { PcaConfiguratorController } from './pca-configurator.controller';
import { PcaConfiguratorService } from './pca-configurator.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [PcaConfiguratorController],
  providers: [PcaConfiguratorService, PrismaService],
  exports: [PcaConfiguratorService],
})
export class PcaConfiguratorModule {}