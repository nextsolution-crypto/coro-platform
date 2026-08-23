import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PcaConfiguratorService } from './pca-configurator.service';

@Controller('pca/configurator')
@UseGuards(AuthGuard('jwt'))
export class PcaConfiguratorController {
  constructor(private readonly pcaConfiguratorService: PcaConfiguratorService) {}

  @Get(':projectId')
  async getConfig(@Param('projectId') projectId: string) {
    return this.pcaConfiguratorService.getConfig(projectId);
  }

  @Post(':projectId')
  async saveConfig(
    @Param('projectId') projectId: string,
    @Body() data: any,
  ) {
    return this.pcaConfiguratorService.saveConfig(projectId, data);
  }

  @Get(':projectId/linked-pmu')
  async getLinkedPmu(@Param('projectId') projectId: string) {
    return this.pcaConfiguratorService.getLinkedPmu(projectId);
  }
}